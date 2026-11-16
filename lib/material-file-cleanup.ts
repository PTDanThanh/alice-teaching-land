/**
 * BƯỚC 11E.2 - MATERIAL FILE CLEANUP DRY-RUN
 *
 * Mục đích:
 * - Liệt kê object trong staging và verified.
 * - Kiểm tra các tham chiếu MongoDB.
 * - Phát hiện object có khả năng không còn được sử dụng.
 *
 * BẢO MẬT:
 * - Không xóa object trên R2.
 * - Không cập nhật MongoDB.
 * - Không xử lý original hoặc preview.
 * - Không coi kết quả dry-run là quyền được xóa.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import {
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";

import connectToDatabase from "@/lib/mongodb";

import {
    getR2Bucket,
    getR2Client,
    isValidMaterialKey,
} from "@/lib/material-storage";

import MaterialUploadModel from "@/src/models/materialUpload";
import MaterialModel from "@/src/models/Material";

// =====================================================
// 1. CẤU HÌNH CLEANUP
// =====================================================

// Chỉ xem xét object đã tồn tại ít nhất 24 giờ.
// Đây là ngưỡng sàng lọc, không phải bảo đảm an toàn xóa.
const MIN_OBJECT_AGE_MS = 24 * 60 * 60 * 1000;

// Giới hạn số object đọc trong một lượt.
// Giúp tránh quét toàn bộ bucket không kiểm soát.
const MAX_OBJECTS_PER_RUN = 500;

// Chỉ quét hai vùng của quy trình bảo mật mới.
const CLEANUP_PREFIXES = [
    "materials/staging/",
    "materials/verified/",
] as const;

type CleanupArea = "staging" | "verified";

export type MaterialCleanupCandidate = {
    key: string;
    area: CleanupArea;
    lastModified: string;
    size: number;
    reason: string;
};

export type MaterialCleanupResult = {
    dryRun: true;
    scanned: number;
    skipped: number;
    candidates: MaterialCleanupCandidate[];
    truncated: boolean;
};
// =====================================================
// BƯỚC 11E.4 - CẤU HÌNH CLEANUP JOB
// =====================================================

// Chờ ít nhất 24 giờ sau khi upload hết hạn.
const CLEANUP_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

// Mỗi worker giữ quyền xử lý tối đa 5 phút.
// Đây chưa phải cơ chế khóa chống mọi race condition.
const CLEANUP_LEASE_MS = 5 * 60 * 1000;

// Giới hạn số lần nhận job.
const MAX_CLEANUP_ATTEMPTS = 3;

export type MaterialCleanupClaim = {
    uploadId: string;
    objectKey: string;
    cleanupToken: string;
    cleanupLeaseExpiresAt: Date;
};

// =====================================================
// 2. KIỂM TRA THAM CHIẾU MONGODB
// =====================================================

async function isReferencedByUpload(
key: string
): Promise<boolean> {
    // objectKey:
    // Key hiện tại của upload, bất kể trạng thái.
    //
    // promotionVerifiedKey:
    // Key được worker dự trữ để phục hồi promotion.
    //
    // Không loại trừ upload hết hạn hoặc failed ở bước này.
    // Việc giải phóng các tham chiếu đó cần một quy trình
    // riêng, có kiểm soát trạng thái và thời gian.
    const exists = await MaterialUploadModel.exists({
        $or: [
            { objectKey: key },
            { promotionVerifiedKey: key },
        ],
    });

    return exists !== null;
}

async function isReferencedByMaterial(
key: string
): Promise<boolean> {
    // Bảo vệ cả file gốc và file PDF preview.
    const exists = await MaterialModel.exists({
        $or: [
            { downloadUrl: key },
            { previewKey: key },
        ],
    });

    return exists !== null;
}

// =====================================================
// 3. ĐÁNH GIÁ MỘT OBJECT
// =====================================================

async function evaluateObject(
key: string,
lastModified: Date | undefined,
size: number | undefined,
area: CleanupArea,
now: number
): Promise<MaterialCleanupCandidate | null> {
    // Không xử lý key sai định dạng.
    if (!isValidMaterialKey(key)) {
        return null;
    }

    // Chỉ nhận key đúng vùng đang quét.
    if (!key.startsWith(`materials/${area}/`)) {
        return null;
    }

    // Không xử lý object thiếu metadata.
    if (
        !lastModified ||
        !Number.isFinite(lastModified.getTime()) ||
size === undefined ||
        !Number.isSafeInteger(size) ||
size < 0
    ) {
        return null;
    }

    // Không xem xét file còn quá mới.
    if (
now - lastModified.getTime() <
        MIN_OBJECT_AGE_MS
    ) {
        return null;
    }

    // Không đưa file đang có upload record vào danh sách.
    if (await isReferencedByUpload(key)) {
        return null;
    }

    // Không đưa file đang được tài liệu sử dụng vào danh sách.
    if (await isReferencedByMaterial(key)) {
        return null;
    }

    // Đây chỉ là ứng viên cần xem xét.
    // Không có nghĩa là object đã an toàn để xóa.
    return {
        key,
        area,
        lastModified: lastModified.toISOString(),
        size,
        reason:
            "Object đủ tuổi và không tìm thấy tham chiếu " +
            "trong các collection đã kiểm tra.",
    };
}

// =====================================================
// 4. QUÉT R2 Ở CHẾ ĐỘ DRY-RUN
// =====================================================

export async function runMaterialCleanupDryRun():
Promise<MaterialCleanupResult> {
    await connectToDatabase();

    const candidates: MaterialCleanupCandidate[] = [];

    let scanned = 0;
    let skipped = 0;
    let truncated = false;

    const now = Date.now();

    // Quét từng vùng độc lập.
    for (const prefix of CLEANUP_PREFIXES) {
        const area: CleanupArea =
            prefix === "materials/staging/"
                ? "staging"
                : "verified";

        let continuationToken: string | undefined;

        do {
            // Không đọc vượt giới hạn cấu hình.
            if (scanned >= MAX_OBJECTS_PER_RUN) {
                truncated = true;
                break;
            }

            const remaining = MAX_OBJECTS_PER_RUN - scanned;

            const response = await getR2Client().send(
new ListObjectsV2Command({
                    Bucket: getR2Bucket(),
                    Prefix: prefix,
                    MaxKeys: Math.min(1000, remaining),
                    ContinuationToken: continuationToken,
                })
            );

            const objects = response.Contents ?? [];

            for (const object of objects) {
                if (scanned >= MAX_OBJECTS_PER_RUN) {
                    truncated = true;
                    break;
                }

                scanned += 1;

                if (!object.Key) {
                    skipped += 1;
                    continue;
                }

                const candidate = await evaluateObject(
                    object.Key,
                    object.LastModified,
                    object.Size,
                    area,
                    now
                );

                if (candidate) {
                    candidates.push(candidate);
                } else {
                    skipped += 1;
                }
            }

            // Chỉ tiếp tục khi R2 còn trang tiếp theo.
            continuationToken =
                response.IsTruncated
                    ? response.NextContinuationToken
                    : undefined;

            // Không tiếp tục nếu R2 báo còn dữ liệu
            // nhưng không cung cấp continuation token.
            if (
                response.IsTruncated &&
                !continuationToken
            ) {
                truncated = true;
                break;
            }

            if (
                scanned >= MAX_OBJECTS_PER_RUN &&
                continuationToken
            ) {
                truncated = true;
                break;
            }
        } while (continuationToken);

        if (truncated) {
            break;
        }
    }

    return {
        dryRun: true,
        scanned,
        skipped,
        candidates,
        truncated,
    };
}

/**
 * BƯỚC 11E.4 - CLAIM CLEANUP JOB
 *
 * Chỉ nhận upload:
 * - Đã hết hạn ít nhất 24 giờ.
 * - Chưa được gắn vào tài liệu.
 * - Không đang scan hoặc promotion.
 * - Chưa vượt số lần cleanup cho phép.
 *
 * Chưa thực hiện xóa R2.
 */
export async function claimMaterialCleanupJob():
Promise<MaterialCleanupClaim | null> {
    await connectToDatabase();

    const now = new Date();

    const expiredBefore = new Date(
        now.getTime() - CLEANUP_GRACE_PERIOD_MS
    );

    const cleanupToken = randomUUID();

    const cleanupLeaseExpiresAt = new Date(
        now.getTime() + CLEANUP_LEASE_MS
    );

    // Chỉ chọn các job đang pending.
    // Recovery job cleaning sẽ được xử lý riêng.
    const upload = await MaterialUploadModel.findOneAndUpdate(
        {
            status: {
                $in: ["pending", "confirmed"],
            },

            // Không nhận upload còn gắn với tài liệu.
            materialId: null,

            // Phiên upload phải hết hạn đủ lâu.
            expiresAt: {
                $lte: expiredBefore,
            },

            // Không nhận job đang quét.
            scanStatus: {
                $in: [
                    "pending",
                    "clean",
                    "infected",
                    "failed",
                ],
            },

            // Không nhận job đang promotion.
            promotionStatus: {
                $in: [
                    "pending",
                    "completed",
                    "failed",
                ],
            },

            cleanupStatus: "pending",

            cleanupAttempts: {
                $lt: MAX_CLEANUP_ATTEMPTS,
            },
        },
        {
            $set: {
                cleanupStatus: "cleaning",
                cleanupToken,
                cleanupLeaseExpiresAt,
            },

            $inc: {
                cleanupAttempts: 1,
            },
        },
        {
            sort: {
                expiresAt: 1,
                _id: 1,
            },
            returnDocument: "after",
        }
    );

    if (!upload) {
        return null;
    }

    return {
        uploadId: upload.uploadId,
        objectKey: upload.objectKey,
        cleanupToken,
        cleanupLeaseExpiresAt,
    };
}

/**
 * BƯỚC 11E.4 - RECOVERY CLEANUP JOB
 *
 * Đưa các job cleaning đã hết lease về pending.
 * Không xóa file và không cập nhật trạng thái scan.
 */
export async function recoverExpiredMaterialCleanupJobs(): Promise<number> {
    await connectToDatabase();

    const now = new Date();
    // 11E.5D: Recovery có giới hạn, không thu hồi lease mới.
    const expiredJobs = await MaterialUploadModel.find({
        cleanupStatus: "cleaning",
        cleanupLeaseExpiresAt: { $lte: now },
    })
        .sort({ cleanupLeaseExpiresAt: 1, _id: 1 })
        .limit(100)
        .select("_id cleanupToken cleanupLeaseExpiresAt cleanupAttempts")
        .lean();

    let recovered = 0;
    for (const job of expiredJobs) {
        const attempts = job.cleanupAttempts ?? 0;
        const nextStatus = attempts >= MAX_CLEANUP_ATTEMPTS
            ? "failed"
            : "pending";

        // Token + lease + attempts: không ghi đè một claim mới.
        const result = await MaterialUploadModel.updateOne(
            {
                _id: job._id,
                cleanupStatus: "cleaning",
                cleanupToken: job.cleanupToken,
                cleanupLeaseExpiresAt: job.cleanupLeaseExpiresAt,
                $and: [
                    { cleanupLeaseExpiresAt: { $lte: now } },
                    attempts === 0
                        ? { $or: [
                            { cleanupAttempts: 0 },
                            { cleanupAttempts: { $exists: false } },
                        ] }
                        : { cleanupAttempts: attempts },
                ],
            },
            {
                $set: {
                    cleanupStatus: nextStatus,
                    cleanupToken: null,
                    cleanupLeaseExpiresAt: null,
                },
            }
        );
        if (result.modifiedCount === 1) recovered += 1;
    }
    return recovered;
}

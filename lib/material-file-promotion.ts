
import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import {
    GetObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";

import MaterialUpload from "@/src/models/materialUpload";

import {
    MAX_MATERIAL_FILE_SIZE,
    createMaterialVerifiedKey,
    getR2Bucket,
    getR2Client,
    isValidMaterialKey,
    readMaterialObjectForScanning,
    uploadVerifiedMaterialObject,
} from "@/lib/material-storage";

import {
    calculateMaterialChecksum,
    validateMaterialFileSignature,
} from "@/lib/material-file-security";

// =====================================================
// BƯỚC 11C / 11D - CẤU HÌNH
// =====================================================

const MAX_PROMOTION_ATTEMPTS = 3;
const DEFAULT_PROMOTION_LEASE_MS = 5 * 60 * 1000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

const CONTENT_TYPES: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export type MaterialPromotionJob = {
    id: string;
    stagingKey: string;
    verifiedKey: string;
    originalName: string;
    fileSize: number;
    fileChecksum: string;
    promotionToken: string;
    leaseExpiresAt: Date;
};

export type MaterialPromotionOutcome =
    | "promoted"
    | "not_eligible"
    | "stale"
    | "failed";

export type MaterialPromotionResult = {
    outcome: MaterialPromotionOutcome;
    verifiedKey: string | null;
};

// =====================================================
// 1. HÀM HỖ TRỢ
// =====================================================

function assertPromotionLease(leaseMs: number): void {
    if (
        !Number.isSafeInteger(leaseMs) ||
        leaseMs < 1_000 ||
        leaseMs > 15 * 60 * 1000
    ) {
        throw new Error("INVALID_PROMOTION_LEASE");
    }
}

function assertVerifiedKey(key: string): void {
    if (
        !isValidMaterialKey(key) ||
        !key.startsWith("materials/verified/")
    ) {
        throw new Error("INVALID_VERIFIED_KEY");
    }
}

function isMissingObject(error: unknown): boolean {
    return (
        error instanceof Error &&
        (error.name === "NotFound" ||
            error.name === "NoSuchKey" ||
            error.name === "404")
    );
}

// Đọc Verified với giới hạn 20 MiB.
async function readVerifiedObject(
    key: string
): Promise<Buffer> {
    assertVerifiedKey(key);

    const response = await getR2Client().send(
        new GetObjectCommand({
            Bucket: getR2Bucket(),
            Key: key,
        })
    );

    if (!response.Body) {
        throw new Error("VERIFIED_OBJECT_EMPTY");
    }

    const body = response.Body;

    if (!(body instanceof Readable)) {
        throw new Error("VERIFIED_INVALID_STREAM");
    }

    if (
        response.ContentLength !== undefined &&
        response.ContentLength > MAX_MATERIAL_FILE_SIZE
    ) {
        body.destroy();
        throw new Error("VERIFIED_FILE_TOO_LARGE");
    }

    const chunks: Buffer[] = [];
    let total = 0;

    try {
        for await (const chunk of body) {
            const buffer = Buffer.isBuffer(chunk)
                ? chunk
                : Buffer.from(chunk as Uint8Array);

            total += buffer.length;

            if (total > MAX_MATERIAL_FILE_SIZE) {
                throw new Error("VERIFIED_FILE_TOO_LARGE");
            }

            chunks.push(buffer);
        }
    } catch (error) {
        body.destroy();
        throw error;
    }

    if (total === 0) {
        throw new Error("VERIFIED_OBJECT_EMPTY");
    }

    return Buffer.concat(chunks, total);
}

// Kiểm tra object đã tồn tại.
// Lỗi mạng/phân quyền không được xem là object chưa có.
async function verifiedObjectExists(
    key: string
): Promise<boolean> {
    assertVerifiedKey(key);

    try {
        await getR2Client().send(
            new HeadObjectCommand({
                Bucket: getR2Bucket(),
                Key: key,
            })
        );

        return true;
    } catch (error) {
        if (isMissingObject(error)) {
            return false;
        }

        throw error;
    }
}

// =====================================================
// 2. ATOMIC CLAIM PROMOTION JOB
// =====================================================

export async function claimPendingMaterialPromotionJob(
    leaseMs = DEFAULT_PROMOTION_LEASE_MS
): Promise<MaterialPromotionJob | null> {
    assertPromotionLease(leaseMs);

    const now = new Date();
    const leaseExpiresAt = new Date(
        now.getTime() + leaseMs
    );
    const promotionToken = randomUUID();

    // Chỉ một Worker có thể chuyển pending -> promoting.
    const upload = await MaterialUpload.findOneAndUpdate(
        {
            status: "confirmed",
            scanStatus: "clean",
            promotionStatus: "pending",
            // 11E.5A: Chỉ xử lý khi cleanup chưa claim job.
            cleanupStatus: "pending",
            objectKey: /^materials\/staging\//,
            fileChecksum: SHA256_PATTERN,
            $or: [
                {
                    promotionAttempts: {
                        $lt: MAX_PROMOTION_ATTEMPTS,
                    },
                },
                {
                    promotionAttempts: {
                        $exists: false,
                    },
                },
            ],
        },
        {
            $set: {
                promotionStatus: "promoting",
                promotionToken,
                promotionLeaseExpiresAt: leaseExpiresAt,
            },
            $inc: {
                promotionAttempts: 1,
            },
        },
        {
            sort: { createdAt: 1, _id: 1 },
            returnDocument: "after",
            runValidators: true,
        }
    ).lean();

    if (!upload) {
        return null;
    }

    return {
        id: String(upload._id),
        stagingKey: upload.objectKey,
        verifiedKey: upload.promotionVerifiedKey ?? "",
        originalName: upload.originalName,
        fileSize: upload.fileSize,
        fileChecksum: upload.fileChecksum!,
        promotionToken,
        leaseExpiresAt,
    };
}

// =====================================================
// 3. KIỂM TRA QUYỀN WORKER
// =====================================================

async function assertPromotionOwnership(
    job: MaterialPromotionJob
): Promise<void> {
    const now = new Date();

    if (job.leaseExpiresAt <= now) {
        throw new Error("PROMOTION_LEASE_EXPIRED");
    }

    const owned = await MaterialUpload.exists({
        _id: job.id,
        status: "confirmed",
        scanStatus: "clean",
        promotionStatus: "promoting",
        // 11E.5A: Chỉ xử lý khi cleanup chưa claim job.
        cleanupStatus: "pending",
        objectKey: job.stagingKey,
        fileChecksum: job.fileChecksum,
        promotionToken: job.promotionToken,
        promotionLeaseExpiresAt: { $gt: now },
    });

    if (!owned) {
        throw new Error("PROMOTION_OWNERSHIP_LOST");
    }
}

// =====================================================
// 4. CHUYỂN FILE SANG VERIFIED
// =====================================================

export async function promoteCleanMaterialUpload(
    job: MaterialPromotionJob
): Promise<MaterialPromotionResult> {
    // Không xử lý nếu Worker không còn quyền.
    await assertPromotionOwnership(job);

    const extension = path
        .extname(job.stagingKey)
        .toLowerCase();

    const contentType = CONTENT_TYPES[extension];

    if (
        !contentType ||
        path.extname(job.originalName).toLowerCase() !==
        extension ||
        !Number.isSafeInteger(job.fileSize) ||
        job.fileSize < 1 ||
        job.fileSize > MAX_MATERIAL_FILE_SIZE ||
        !SHA256_PATTERN.test(job.fileChecksum)
    ) {
        throw new Error("PROMOTION_INVALID_METADATA");
    }

    // 1. Đọc lại staging.
    const content = await readMaterialObjectForScanning(
        job.stagingKey
    );

    // 2. Kiểm tra dung lượng và checksum từ lần quét.
    const checksum = calculateMaterialChecksum(content);

    if (
        content.length !== job.fileSize ||
        checksum.toLowerCase() !==
        job.fileChecksum.toLowerCase()
    ) {
        throw new Error("PROMOTION_CONTENT_MISMATCH");
    }

    // 3. Kiểm tra lại chữ ký file.
    const signature = validateMaterialFileSignature(
        content,
        job.originalName
    );

    if (
        !signature.valid ||
        !signature.extension ||
        signature.extension !== extension
    ) {
        throw new Error("PROMOTION_INVALID_SIGNATURE");
    }

    // 4. Chọn một verified key ổn định cho các lần retry.
    let verifiedKey = job.verifiedKey;

    if (verifiedKey) {
        assertVerifiedKey(verifiedKey);

        if (
            path.extname(verifiedKey).toLowerCase() !==
            extension
        ) {
            throw new Error("PROMOTION_KEY_MISMATCH");
        }
    } else {
        const candidateKey =
            createMaterialVerifiedKey(extension);

        // Ghi key dự kiến vào MongoDB trước khi ghi R2.
        // Chỉ Worker đang sở hữu lease được thực hiện.
        const reserved = await MaterialUpload.findOneAndUpdate(
            {
                _id: job.id,
                promotionStatus: "promoting",
                // 11E.5A: Chỉ xử lý khi cleanup chưa claim job.
                cleanupStatus: "pending",
                promotionToken: job.promotionToken,
                promotionLeaseExpiresAt: {
                    $gt: new Date(),
                },
                objectKey: job.stagingKey,
                $or: [
                    { promotionVerifiedKey: null },
                    { promotionVerifiedKey: { $exists: false } },
                ],
            },
            {
                $set: {
                    promotionVerifiedKey: candidateKey,
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).lean();

        if (!reserved) {
            return {
                outcome: "stale",
                verifiedKey: null,
            };
        }

        verifiedKey = candidateKey;
    }

    // 5. Xác nhận Worker vẫn còn quyền.
    await assertPromotionOwnership(job);

    // 6. Nếu Verified đã tồn tại từ lần chạy trước,
    // không ghi đè mà đọc lại để kiểm tra.
    const exists = await verifiedObjectExists(
        verifiedKey
    );

    if (!exists) {
        // Hàm upload phải dùng conditional PUT
        // để từ chối ghi đè object đã tồn tại.
        await uploadVerifiedMaterialObject(
            verifiedKey,
            content,
            contentType
        );
    }

    // 7. Xác minh nội dung Verified.
    const verifiedContent = await readVerifiedObject(
        verifiedKey
    );

    if (
        verifiedContent.length !== content.length ||
        calculateMaterialChecksum(verifiedContent)
            .toLowerCase() !== checksum.toLowerCase()
    ) {
        throw new Error("PROMOTION_VERIFIED_MISMATCH");
    }

    // 8. Atomic commit: chỉ Worker còn lease
    // mới được đổi objectKey và hoàn tất promotion.
    const now = new Date();

    const updated = await MaterialUpload.findOneAndUpdate(
        {
            _id: job.id,
            status: "confirmed",
            scanStatus: "clean",
            promotionStatus: "promoting",
            // 11E.5A: Chỉ xử lý khi cleanup chưa claim job.
            cleanupStatus: "pending",
            promotionToken: job.promotionToken,
            promotionLeaseExpiresAt: { $gt: now },
            promotionVerifiedKey: verifiedKey,
            objectKey: job.stagingKey,
            fileChecksum: job.fileChecksum,
            fileSize: job.fileSize,
        },
        {
            $set: {
                objectKey: verifiedKey,
                promotionStatus: "completed",
                promotedAt: now,
            },
            $unset: {
                promotionToken: "",
                promotionLeaseExpiresAt: "",
            },
        },
        {
            returnDocument: "after",
            runValidators: true,
        }
    ).lean();

    if (!updated) {
        return {
            outcome: "stale",
            verifiedKey: null,
        };
    }

    // Không xóa staging tại đây.
    return {
        outcome: "promoted",
        verifiedKey,
    };
}

// =====================================================
// 5. RECOVERY JOB HẾT LEASE
// =====================================================

export async function recoverExpiredMaterialPromotionJobs(
    batchSize = 100
): Promise<number> {
    if (
        !Number.isSafeInteger(batchSize) ||
        batchSize < 1 ||
        batchSize > 500
    ) {
        throw new Error("INVALID_PROMOTION_RECOVERY_BATCH");
    }

    const now = new Date();

    const expiredJobs = await MaterialUpload.find({
        status: "confirmed",
        scanStatus: "clean",
        promotionStatus: "promoting",
        // 11E.5A: Chỉ xử lý khi cleanup chưa claim job.
        cleanupStatus: "pending",
        objectKey: /^materials\/staging\//,
        promotionLeaseExpiresAt: { $lte: now },
    })
        .sort({ promotionLeaseExpiresAt: 1, _id: 1 })
        .limit(batchSize)
        .select(
            "_id promotionToken promotionLeaseExpiresAt promotionAttempts"
        )
        .lean();

    let recovered = 0;

    for (const job of expiredJobs) {
        const attempts = job.promotionAttempts ?? 0;

        const nextStatus =
            attempts >= MAX_PROMOTION_ATTEMPTS
                ? "failed"
                : "pending";

        // Token + lease fencing tránh thu hồi job mới.
        const result = await MaterialUpload.updateOne(
            {
                _id: job._id,
                status: "confirmed",
                scanStatus: "clean",
                promotionStatus: "promoting",
                // 11E.5A: Chỉ xử lý khi cleanup chưa claim job.
                cleanupStatus: "pending",
                objectKey: /^materials\/staging\//,
                promotionToken: job.promotionToken,
                promotionLeaseExpiresAt:
                    job.promotionLeaseExpiresAt,
                $and: [
                    {
                        promotionLeaseExpiresAt: {
                            $lte: now,
                        },
                    },
                    attempts === 0
                        ? {
                            $or: [
                                { promotionAttempts: 0 },
                                {
                                    promotionAttempts: {
                                        $exists: false,
                                    },
                                },
                            ],
                        }
                        : { promotionAttempts: attempts },
                ],
            },
            {
                $set: {
                    promotionStatus: nextStatus,
                },
                $unset: {
                    promotionToken: "",
                    promotionLeaseExpiresAt: "",
                },
            }
        );

        if (result.modifiedCount === 1) {
            recovered += 1;
        }
    }

    return recovered;
}


// =====================================================
// BƯỚC 11D - PHÂN LOẠI LỖI PROMOTION
// =====================================================

// Các lỗi liên quan đến nội dung hoặc metadata.
// Không retry vì không thể xem file là an toàn.
const TERMINAL_PROMOTION_ERRORS = new Set([
    "PROMOTION_INVALID_METADATA",
    "PROMOTION_CONTENT_MISMATCH",
    "PROMOTION_INVALID_SIGNATURE",
    "PROMOTION_KEY_MISMATCH",
    "PROMOTION_VERIFIED_MISMATCH",
    "INVALID_VERIFIED_KEY",
    "VERIFIED_FILE_TOO_LARGE",
    "VERIFIED_OBJECT_EMPTY",
    "VERIFIED_INVALID_STREAM",
]);

// Những lỗi này cho thấy worker không còn quyền.
// Không được tự ý thay đổi trạng thái job.
const STALE_PROMOTION_ERRORS = new Set([
    "PROMOTION_LEASE_EXPIRED",
    "PROMOTION_OWNERSHIP_LOST",
]);

function classifyPromotionError(
    error: unknown
): "terminal" | "stale" | "retryable" {
    const message =
        error instanceof Error ? error.message : "";

    if (
        TERMINAL_PROMOTION_ERRORS.has(message)
    ) {
        return "terminal";
    }

    if (
        STALE_PROMOTION_ERRORS.has(message)
    ) {
        return "stale";
    }

    // Những lỗi không xác định được retry có giới hạn.
    // Không đồng nghĩa với việc file đã an toàn.
    return "retryable";
}


// =====================================================
// 6. THỰC HIỆN MỘT LƯỢT PROMOTION WORKER
// =====================================================

export async function runMaterialPromotionWorkerOnce(
    options: {
        leaseMs?: number;
        recoveryBatchSize?: number;
    } = {}
): Promise<{
    recovered: number;
    processed: boolean;
    jobId: string | null;
    outcome: MaterialPromotionOutcome | null;
}> {
    const recovered =
        await recoverExpiredMaterialPromotionJobs(
            options.recoveryBatchSize ?? 100
        );

    const job = await claimPendingMaterialPromotionJob(
        options.leaseMs ?? DEFAULT_PROMOTION_LEASE_MS
    );

    if (!job) {
        return {
            recovered,
            processed: false,
            jobId: null,
            outcome: null,
        };
    }

    try {
        const result = await promoteCleanMaterialUpload(job);

        return {
            recovered,
            processed: true,
            jobId: job.id,
            outcome: result.outcome,
        };

    } catch (error) {
        // =================================================
        // BƯỚC 11D - RETRY CÓ GIỚI HẠN
        // =================================================

        const errorType = classifyPromotionError(error);
        const now = new Date();

        // Worker đã mất quyền hoặc lease hết hạn.
        // Không tự cập nhật job.
        // Recovery sẽ xử lý khi đủ điều kiện.
        if (errorType === "stale") {
            return {
                recovered,
                processed: true,
                jobId: job.id,
                outcome: "stale",
            };
        }

        // Đọc số lần promotion đã thực hiện.
        // Chỉ đọc job vẫn thuộc quyền worker hiện tại.
        const currentJob = await MaterialUpload.findOne({
            _id: job.id,
            status: "confirmed",
            scanStatus: "clean",
            promotionStatus: "promoting",
            // 11E.5A: Chỉ xử lý khi cleanup chưa claim job.
            cleanupStatus: "pending",
            promotionToken: job.promotionToken,
            promotionLeaseExpiresAt: { $gt: now },
            objectKey: job.stagingKey,
        })
            .select("promotionAttempts")
            .lean();

        if (!currentJob) {
            return {
                recovered,
                processed: true,
                jobId: job.id,
                outcome: "stale",
            };
        }

        const attempts = currentJob.promotionAttempts ?? 0;

        // Lỗi xác minh bảo mật => failed ngay.
        // Lỗi tạm thời => pending nếu còn lượt thử.
        const nextStatus =
            errorType === "terminal" ||
                attempts >= MAX_PROMOTION_ATTEMPTS
                ? "failed"
                : "pending";

        // Atomic update:
        // Chỉ worker còn token và lease hợp lệ
        // mới được thay đổi trạng thái.
        const updated = await MaterialUpload.updateOne(
            {
                _id: job.id,
                status: "confirmed",
                scanStatus: "clean",
                promotionStatus: "promoting",
                // 11E.5A: Chỉ xử lý khi cleanup chưa claim job.
                cleanupStatus: "pending",
                promotionToken: job.promotionToken,
                promotionLeaseExpiresAt: { $gt: new Date() },
                objectKey: job.stagingKey,
                promotionAttempts: attempts,
            },
            {
                $set: {
                    promotionStatus: nextStatus,
                },
                $unset: {
                    promotionToken: "",
                    promotionLeaseExpiresAt: "",
                },
            }
        );

        if (updated.modifiedCount !== 1) {
            return {
                recovered,
                processed: true,
                jobId: job.id,
                outcome: "stale",
            };
        }

        // Không ghi objectKey, checksum hoặc nội dung file.
        console.error("[MaterialPromotion] Attempt failed", {
            errorType,
            attempts,
            nextStatus,
        });

        return {
            recovered,
            processed: true,
            jobId: job.id,
            outcome: "failed",
        };
    }
}
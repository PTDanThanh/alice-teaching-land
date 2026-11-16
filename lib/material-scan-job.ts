import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Types } from "mongoose";

import MaterialUpload from "@/src/models/materialUpload";

import {
    MAX_MATERIAL_FILE_SIZE,
    readMaterialObjectForScanning,
} from "@/lib/material-storage";

import {
    validateMaterialFileSignature,
    calculateMaterialChecksum,
    type MaterialFileExtension,
} from "@/lib/material-file-security";

import type {
    MaterialMalwareScanner,
} from "@/lib/material-malware-scanner";

// =====================================================
// 1. CẤU HÌNH VÀ TYPES
// =====================================================

// Thời hạn mặc định worker được quyền xử lý một job.
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
// Tối đa 3 lần xử lý: 1 lần đầu và 2 lần thử lại.
const MAX_SCAN_ATTEMPTS = 3;

// Các thông tin của job đã được worker nhận.
export type MaterialScanJob = {
    id: string;
    objectKey: string;
    originalName: string;
    fileSize: number;
    workerToken: string;
    leaseExpiresAt: Date;
};

// Nội dung file đã vượt qua kiểm tra sơ bộ.
//
// Lưu ý: Điều này KHÔNG có nghĩa file sạch virus.
export type MaterialScanJobContent = {
    objectKey: string;
    originalName: string;
    extension: MaterialFileExtension;
    fileSize: number;
    checksum: string;
    content: Buffer;
};

// Kết quả thực hiện job quét virus.
//
// stale: worker đã mất quyền cập nhật kết quả.
export type MaterialScanJobOutcome =
    | "clean"
    | "infected"
    | "failed"
    | "stale";

// =====================================================
// 2. BƯỚC 10B - NHẬN VÀ KHÓA JOB
// =====================================================

/**
 * Nhận một job đang chờ quét virus.
 *
 * Sử dụng findOneAndUpdate để bảo đảm
 * nhiều worker không nhận cùng một job pending.
 *
 * Lưu ý:
 * - MongoDB phải được kết nối trước khi gọi.
 * - Chưa tự động nhận lại job có lease hết hạn.
 */
export async function claimPendingMaterialScanJob(
leaseMs: number = DEFAULT_LEASE_MS
): Promise<MaterialScanJob | null> {
    // Kiểm tra thời hạn lease.
    if (
        !Number.isSafeInteger(leaseMs) ||
leaseMs < 1_000 ||
leaseMs > 15 * 60 * 1000
    ) {
        throw new Error("INVALID_MATERIAL_SCAN_LEASE");
    }

    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);
    const workerToken = randomUUID();

    // Chỉ claim job chưa đạt giới hạn.
    // $exists hỗ trợ bản ghi cũ chưa có scanAttempts.
    const upload = await MaterialUpload.findOneAndUpdate(
        {
            scanStatus: "pending",
            // 11E.5B: Cleanup chưa được claim.
            cleanupStatus: "pending",
            status: "confirmed",
            objectKey: /^materials\/staging\//,
            $or: [
                { scanAttempts: { $lt: MAX_SCAN_ATTEMPTS } },
                { scanAttempts: { $exists: false } },
            ],
        },
        {
            $set: {
                scanStatus: "scanning",
                workerToken,
                leaseExpiresAt,
            },

            // Tăng bộ đếm ngay khi nhận job.
            // Thao tác này atomic cùng với việc claim.
            $inc: {
                scanAttempts: 1,
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
        id: String(upload._id as Types.ObjectId),
        objectKey: upload.objectKey,
        originalName: upload.originalName,
        fileSize: upload.fileSize,
        workerToken,
        leaseExpiresAt,
    };
}
// =====================================================
// 3. BƯỚC 10C - ĐỌC VÀ XÁC MINH FILE TỪ R2
// =====================================================

/**
 * Đọc file từ vùng staging trên Cloudflare R2.
 *
 * Kiểm tra:
 * - Object key thuộc staging.
 * - Dung lượng file.
 * - Phần mở rộng.
 * - Magic bytes.
 * - SHA-256.
 *
 * Trả về Buffer để quét virus.
 *
 * Không cập nhật MongoDB.
 * Không đánh dấu file là clean.
 */
export async function loadMaterialScanJobContent(
job: MaterialScanJob
): Promise<MaterialScanJobContent> {
    // 1. Chỉ cho phép đọc object thuộc staging.
    if (!job.objectKey.startsWith("materials/staging/")) {
        throw new Error("MATERIAL_NOT_IN_STAGING");
    }

    // 2. Kiểm tra dung lượng khai báo.
    if (
        !Number.isSafeInteger(job.fileSize) ||
job.fileSize <= 0 ||
job.fileSize > MAX_MATERIAL_FILE_SIZE
    ) {
        throw new Error("MATERIAL_INVALID_EXPECTED_SIZE");
    }

    // 3. Đối chiếu phần mở rộng.
    const originalExtension = path
        .extname(job.originalName)
        .toLowerCase();

    const objectExtension = path
        .extname(job.objectKey)
        .toLowerCase();

    const allowedExtensions = new Set([
        ".pdf",
        ".doc",
        ".docx",
        ".ppt",
        ".pptx",
    ]);

    if (
        !allowedExtensions.has(originalExtension) ||
        originalExtension !== objectExtension
    ) {
        throw new Error("MATERIAL_EXTENSION_MISMATCH");
    }

    // 4. Đọc file từ R2 vào Buffer.
    // Hàm storage phải giới hạn byte khi đọc stream.
    const content = await readMaterialObjectForScanning(
job.objectKey
    );

    // 5. Kiểm tra dung lượng thực tế.
    if (content.length !== job.fileSize) {
        throw new Error("MATERIAL_FILE_SIZE_MISMATCH");
    }

    // 6. Kiểm tra magic bytes.
    const signature = validateMaterialFileSignature(
        content,
        job.originalName
    );

    if (!signature.valid || !signature.extension) {
        throw new Error(
            signature.reason ?? "MATERIAL_INVALID_FILE_SIGNATURE"
        );
    }

    // 7. Tính checksum SHA-256.
    const checksum = calculateMaterialChecksum(content);

    // 8. Trả về chính Buffer đã kiểm tra.
    // Worker không cần đọc lại R2 để quét.
    return {
        objectKey: job.objectKey,
        originalName: job.originalName,
        extension: signature.extension,
        fileSize: content.length,
        checksum,
        content,
    };
}

// =====================================================
// 4. BƯỚC 10D - QUÉT CLAMAV VÀ LƯU KẾT QUẢ
// =====================================================

/**
 * Quét file bằng scanner được truyền vào.
 *
 * Scanner có thể là:
 * - ClamAVMaterialScanner trong môi trường thật.
 * - Mock scanner khi chạy unit test.
 *
 * Quy tắc:
 * - Lỗi đọc R2 hoặc lỗi ClamAV => failed.
 * - Worker mất lease => stale.
 * - Chỉ cập nhật DB khi workerToken còn hợp lệ.
 * - Không chuyển file sang verified.
 */
export async function scanClaimedMaterialJob(
job: MaterialScanJob,
scanner: MaterialMalwareScanner,
timeoutMs = 30_000
): Promise<MaterialScanJobOutcome> {
    // 1. Kiểm tra timeout.
    if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1_000 ||
        timeoutMs > 120_000
    ) {
        throw new Error("INVALID_MATERIAL_SCAN_TIMEOUT");
    }

    // 2. Kiểm tra lease trước khi xử lý.
    if (job.leaseExpiresAt.getTime() <= Date.now()) {
        return "stale";
    }

    // Mặc định failed để bảo đảm fail closed.
    let scanStatus: "clean" | "infected" | "failed" =
        "failed";

    let checksum: string | null = null;
    let scannerVersion: string | null = null;

    try {
        // 3. Đọc và kiểm tra Buffer từ R2 (10C).
        const file = await loadMaterialScanJobContent(job);

        checksum = file.checksum;

        // 4. Không quét nếu worker đã hết lease.
        if (job.leaseExpiresAt.getTime() <= Date.now()) {
            return "stale";
        }

        // 5. Gửi Buffer sang ClamAV.
        const result = await scanner.scan({
            content: file.content,
            originalName: file.originalName,
            timeoutMs,
        });

        // 6. Chỉ chấp nhận trạng thái hợp lệ.
        if (
            result.status === "clean" ||
            result.status === "infected"
        ) {
            scanStatus = result.status;
            scannerVersion = result.scannerVersion;
        }
    } catch {
        // Lỗi đọc file, xác minh hoặc quét virus.
        // Không đánh dấu clean khi xảy ra lỗi.
        scanStatus = "failed";
    }

    const now = new Date();

    // 7. Không cho worker hết lease ghi kết quả.
    if (job.leaseExpiresAt.getTime() <= now.getTime()) {
        return "stale";
    }

    // 8. Atomic update bằng workerToken.
    const updated = await MaterialUpload.findOneAndUpdate(
        {
            _id: job.id,
            objectKey: job.objectKey,
            status: "confirmed",
            scanStatus: "scanning",
            // 11E.5B: Atomic commit chỉ khi cleanup chưa claim.
            cleanupStatus: "pending",
            workerToken: job.workerToken,
            leaseExpiresAt: {
                $gt: now,
            },
        },
        {
            $set: {
                scanStatus,
                scannedAt: now,
                fileChecksum: checksum,
                ...(scannerVersion
                    ? { scannerVersion }
                    : {}),
            },
            $unset: {
                workerToken: "",
                leaseExpiresAt: "",
            },
        },
        {
            returnDocument: "after",
            runValidators: true,
        }
    ).lean();

    // 9. Không cập nhật được => worker đã mất quyền.
    if (!updated) {
        return "stale";
    }

    return scanStatus;
}


/**
 * BƯỚC 10E:
 * Thu hồi các job có lease đã hết hạn.
 *
 * Chỉ áp dụng cho job:
 * - Đang scanning.
 * - File đã confirmed.
 * - Object thuộc vùng staging.
 * - Lease đã hết hạn.
 *
 * Không thay đổi job clean, infected hoặc failed.
 */
export async function recoverExpiredMaterialScanJobs(
batchSize = 100
): Promise<number> {
    // 1. Giới hạn số job xử lý mỗi lượt
    if (
        !Number.isSafeInteger(batchSize) ||
batchSize < 1 ||
batchSize > 500
    ) {
        throw new Error("INVALID_SCAN_RECOVERY_BATCH_SIZE");
    }

    const now = new Date();

    // 2. Tìm những job đã hết lease.
    const expiredJobs = await MaterialUpload.find({
        scanStatus: "scanning",
        cleanupStatus: "pending",
        status: "confirmed",
        objectKey: /^materials\/staging\//,
        leaseExpiresAt: { $lte: now },
    })
        .sort({ leaseExpiresAt: 1, _id: 1 })
        .limit(batchSize)
        .select("_id workerToken leaseExpiresAt scanAttempts")
        .lean();

    let recoveredCount = 0;

    // 3. Thu hồi từng job bằng điều kiện atomic.
    for (const job of expiredJobs) {
        const attempt = job.scanAttempts ?? 0;

        //nếu nhận job lần thứ 3 thì kết thúc với failed
        //nếu chưa, đưa về pending để nhận lại
        const nextStatus =
            attempt >= MAX_SCAN_ATTEMPTS
                ? "failed"
                : "pending";

        const result = await MaterialUpload.updateOne(
            {
                _id: job._id,
                scanStatus: "scanning",
                cleanupStatus: "pending",
                status: "confirmed",
                objectKey: /^materials\/staging\//,
                //không được thu hồi job đã được worker nhận lại
                workerToken: job.workerToken,
                //không được cập nhật khi lease đã được gia hạn
                leaseExpiresAt: job.leaseExpiresAt,
                // Chỉ xử lý khi lease vẫn đã hết hạn.
                $and: [
                    { leaseExpiresAt: { $lte: now } },

                    // Bảo đảm bộ đếm không bị thay đổi
                    // giữa lúc đọc và lúc cập nhật.
                    attempt === 0
                        ? {
                            $or: [
                                { scanAttempts: 0 },
                                { scanAttempts: { $exists: false } },
                            ],
                        }
                        : { scanAttempts: attempt },
                ],
            },
            {
                $set: {
                    scanStatus: nextStatus,

                    // Chỉ ghi thời điểm hoàn tất khi failed.
                    ...(nextStatus === "failed"
                        ? { scannedAt: now }
                        : {}),
                },
                $unset: {
                    workerToken: "",
                    leaseExpiresAt: "",
                },
            }
        );

        if (result.modifiedCount === 1) {
            recoveredCount += 1;
        }
    }

    return recoveredCount;
}



/**
 * BƯỚC 10F:
 * Thực hiện một lượt xử lý Background Worker.
 *
 * Hàm này:
 * - Khôi phục job hết lease.
 * - Nhận tối đa một job pending.
 * - Quét nội dung bằng ClamAV.
 * - Trả về kết quả xử lý.
 *
 * Không tự tạo vòng lặp.
 * Không tự kết nối MongoDB.
 * Không chuyển file sang verified.
 */

export type MaterialScanWorkerRunResult = {
    recovered: number;
    processed: boolean;
    jobId: string | null;
    outcome: MaterialScanJobOutcome | null;
};

export async function runMaterialScanWorkerOnce(
scanner: MaterialMalwareScanner,
options: {
        leaseMs?: number;
        timeoutMs?: number;
        recoveryBatchSize?: number;
    } = {}
): Promise<MaterialScanWorkerRunResult> {
    // 1. Khôi phục các job scanning đã hết lease.
    const recovered = await recoverExpiredMaterialScanJobs(
        options.recoveryBatchSize ?? 100
    );

    // 2. Nhận một job pending.
    const job = await claimPendingMaterialScanJob(
        options.leaseMs ?? DEFAULT_LEASE_MS
    );

    // 3. Không có job cần xử lý.
    if (!job) {
        return {
            recovered,
            processed: false,
            jobId: null,
            outcome: null,
        };
    }

    // 4. Quét file và ghi kết quả vào MongoDB.
    const outcome = await scanClaimedMaterialJob(
        job,
        scanner,
        options.timeoutMs ?? 30_000
    );

    // 5. Trả về thông tin để tiến trình chạy nền
    // có thể ghi log hoặc thống kê.
    return {
        recovered,
        processed: true,
        jobId: job.id,
        outcome,
    };
}


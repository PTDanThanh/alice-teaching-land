/**
 * BƯỚC 10G + 11C - BACKGROUND MATERIAL WORKER
 *
 * Chạy độc lập với Next.js HTTP server.
 *
 * Chức năng:
 * - Kết nối MongoDB.
 * - Khởi tạo ClamAV scanner.
 * - Quét virus cho file trong staging.
 * - Chuyển file đã quét sạch sang verified.
 * - Recovery các job hết lease.
 * - Dừng an toàn khi nhận SIGINT/SIGTERM.
 *
 * Bảo mật:
 * - Scan và promotion sử dụng token/lease riêng.
 * - Không cấp quyền tải tài liệu trực tiếp.
 * - Không tự động xóa staging.
 * - Không ghi nội dung file vào log.
 *
 * Chỉ chạy trên môi trường Worker riêng.
 */


import mongoose from "mongoose";

import connectToMaterialWorkerDatabase from "@/lib/material-worker-mongodb";

import {
    ClamAVMaterialScanner,
} from "@/lib/material-clamav-scanner";

import {
    getMaterialScanWorkerConfig,
} from "@/lib/material-scan-worker-config";

import {
    runMaterialScanWorkerOnce,
} from "@/lib/material-scan-job";

// BƯỚC 11C:
// Xử lý file đã quét sạch và chuyển từ staging sang verified.
import {
    runMaterialPromotionWorkerOnce,
} from "@/lib/material-file-promotion";
// =====================================================
// 1. QUẢN LÝ TRẠNG THÁI WORKER
// =====================================================

let stopping = false;

// Dùng để đánh thức worker khi nhận tín hiệu dừng.
let wakeUp: (() => void) | null = null;

function requestShutdown(signal: string) {
    if (stopping) return;

    stopping = true;

    console.log(`[MaterialScanWorker] Received ${signal}`);

    // Đánh thức nếu worker đang chờ poll interval.
    wakeUp?.();
}

process.once("SIGINT", () => {
    requestShutdown("SIGINT");
});

process.once("SIGTERM", () => {
    requestShutdown("SIGTERM");
});

// =====================================================
// 2. CHỜ GIỮA CÁC LẦN TÌM JOB
// =====================================================

function sleepUntilNextPoll(ms: number): Promise<void> {
    if (stopping) {
        return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
        let completed = false;

        const finish = () => {
            if (completed) return;

            completed = true;
            clearTimeout(timer);

            wakeUp = null;
            resolve();
        };

        const timer = setTimeout(finish, ms);

        wakeUp = finish;

        // Tránh bỏ lỡ tín hiệu dừng.
        if (stopping) {
            finish();
        }
    });
}

// =====================================================
// 3. KHỞI TẠO VÀ CHẠY WORKER
// =====================================================

async function main(): Promise<void> {
    const config = getMaterialScanWorkerConfig();

    // Nhãn phiên bản scanner.
    // Đây không phải phiên bản được xác thực từ clamd.
    const scannerVersion =
        process.env.CLAMAV_SCANNER_VERSION?.trim() ||
        "clamav-unverified";

    const scanner = new ClamAVMaterialScanner({
        host: config.clamavHost,
        port: config.clamavPort,
        scannerVersion,
    });

    console.log("[MaterialScanWorker] Connecting to MongoDB");

    // Kết nối DB trước khi thực hiện claim/recovery.
    await connectToMaterialWorkerDatabase();

    console.log("[MaterialScanWorker] Started");

    // ===================================================
    // 4. VÒNG LẶP BACKGROUND
    // ===================================================

    while (!stopping) {
        try {
            const result = await runMaterialScanWorkerOnce(
                scanner,
                {
                    // Lease mặc định 5 phút.
                    leaseMs: 5 * 60 * 1000,

                    // Timeout từ cấu hình.
                    timeoutMs: config.scanTimeoutMs,

                    // Mỗi lượt khôi phục tối đa 100 job.
                    recoveryBatchSize: 100,
                }
            );

            // Không ghi objectKey, Buffer hoặc nội dung file
            // vào log để tránh lộ dữ liệu tài liệu.
            if (result.processed || result.recovered > 0) {
                console.log("[MaterialScanWorker] Result", {
                    jobId: result.jobId,
                    outcome: result.outcome,
                    recovered: result.recovered,
                });
            }

            // ===================================================
            // BƯỚC 11C - CHUYỂN FILE CLEAN SANG VERIFIED
            // ===================================================

            // Chỉ thực hiện sau khi đã xử lý lượt quét virus.
            // Promotion có cơ chế claim, token và lease riêng.
            //
            // Không sử dụng scanAttempts hoặc workerToken
            // của quy trình quét virus.

            if (!stopping) {
                try {
                    const promotionResult =
                        await runMaterialPromotionWorkerOnce({
                            // Lease mặc định 5 phút.
                            leaseMs: 5 * 60 * 1000,

                            // Khôi phục tối đa 100 promotion job.
                            recoveryBatchSize: 100,
                        });

                    // Không ghi objectKey, Buffer hoặc nội dung file.
                    if (
                        promotionResult.processed ||
                        promotionResult.recovered > 0
                    ) {
                        console.log(
                            "[MaterialPromotionWorker] Result",
                            {
                                jobId: promotionResult.jobId,
                                outcome: promotionResult.outcome,
                                recovered: promotionResult.recovered,
                            }
                        );
                    }
                } catch (error) {
                    // Lỗi promotion không làm gián đoạn
                    // quá trình quét virus của vòng lặp tiếp theo.
                    //
                    // Job đang promoting sẽ được recovery
                    // khi promotion lease hết hạn.
                    console.error(
                        "[MaterialPromotionWorker] Processing error",
                        error instanceof Error
                            ? error.message
                            : "Unknown error"
                    );
                }
            }

        } catch (error) {
            // Không làm worker chết ngay vì lỗi tạm thời.
            // Job đang scanning sẽ được khôi phục
            // khi lease hết hạn.
            console.error(
                "[MaterialScanWorker] Processing error",
                error instanceof Error ? error.message : "Unknown error"
            );
        }

        // Chờ trước khi xử lý lượt tiếp theo.
        await sleepUntilNextPoll(config.pollIntervalMs);
    }

    console.log("[MaterialScanWorker] Stopped");
}

// =====================================================
// 5. KHỞI CHẠY VÀ DỌN DẸP
// =====================================================

async function start(): Promise<void> {
    try {
        await main();
    } catch (error) {
        process.exitCode = 1;

        console.error(
            "[MaterialScanWorker] Fatal error",
            error instanceof Error ? error.message : "Unknown error"
        );
    } finally {
        // Chỉ đóng DB sau khi lượt xử lý hiện tại hoàn tất.
        await mongoose.disconnect();
    }
}

void start();

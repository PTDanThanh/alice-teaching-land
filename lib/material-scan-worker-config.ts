
import "server-only";

// Giới hạn dung lượng file được quét: 20 MiB.
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Thời gian tối đa cho một lần quét.
const DEFAULT_SCAN_TIMEOUT_MS = 30_000;

// Thời gian chờ giữa các lần tìm job.
const DEFAULT_POLL_INTERVAL_MS = 5_000;

export type MaterialScanWorkerConfig = {
    clamavHost: string;
    clamavPort: number;
    scanTimeoutMs: number;
    pollIntervalMs: number;
    maxFileSize: number;
};

// Chỉ nhận số nguyên trong khoảng hợp lệ.
function parseInteger(
    value: string | undefined,
    fallback: number,
    min: number,
    max: number
): number {
    if (value === undefined || value.trim() === "") {
        return fallback;
    }

    const parsed = Number(value);

    if (
        !Number.isSafeInteger(parsed) ||
        parsed < min ||
        parsed > max
    ) {
        throw new Error("INVALID_MATERIAL_SCAN_WORKER_CONFIG");
    }

    return parsed;
}

// Đọc cấu hình từ biến môi trường của worker.
export function getMaterialScanWorkerConfig():
    MaterialScanWorkerConfig {
    return {
        clamavHost:
            process.env.CLAMAV_HOST?.trim() ||
            "127.0.0.1",

        clamavPort: parseInteger(
            process.env.CLAMAV_PORT,
            3310,
            1,
            65535
        ),

        scanTimeoutMs: parseInteger(
            process.env.MATERIAL_SCAN_TIMEOUT_MS,
            DEFAULT_SCAN_TIMEOUT_MS,
            1000,
            120_000
        ),

        pollIntervalMs: parseInteger(
            process.env.MATERIAL_SCAN_POLL_INTERVAL_MS,
            DEFAULT_POLL_INTERVAL_MS,
            1000,
            60_000
        ),

        maxFileSize: MAX_FILE_SIZE,
    };
}

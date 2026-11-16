
import "server-only";

import net from "node:net";

import type {
    MaterialMalwareScanner,
    MaterialMalwareScanInput,
    MaterialMalwareScanResult,
} from "@/lib/material-malware-scanner";

// Giới hạn dung lượng file được phép quét: 20 MiB.
const MAX_SCAN_BYTES = 20 * 1024 * 1024;

// Giới hạn phản hồi từ ClamAV để tránh sử dụng bộ nhớ quá mức.
const MAX_RESPONSE_BYTES = 4096;

// Gửi dữ liệu theo từng chunk tối đa 64 KiB.
const CHUNK_SIZE = 64 * 1024;

// Giới hạn timeout tối đa của một lần quét.
const MAX_SCAN_TIMEOUT_MS = 120_000;

// Giao thức zINSTREAM của clamd.
const INSTREAM_COMMAND = Buffer.from("zINSTREAM\0", "ascii");

// Chunk có kích thước 0 đánh dấu kết thúc dữ liệu.
const END_MARKER = Buffer.alloc(4);

export type ClamAVScannerConfig = {
    // Địa chỉ clamd trong mạng nội bộ.
    host: string;

    // Cổng TCP của clamd.
    port: number;

    // Nhãn phiên bản do hệ thống cấu hình.
    // Chưa phải phiên bản được xác thực trực tiếp từ daemon.
    scannerVersion: string;
};

/**
 * ClamAV adapter dành cho background worker.
 *
 * Nguyên tắc:
 * - Quét đúng Buffer được cung cấp.
 * - Có deadline tuyệt đối cho toàn bộ phiên quét.
 * - Xử lý backpressure khi gửi dữ liệu.
 * - Không coi phản hồi không hợp lệ là clean.
 * - Không tự ghi R2 hoặc cập nhật MongoDB.
 */
export class ClamAVMaterialScanner
    implements MaterialMalwareScanner {

    constructor(
        private readonly config: ClamAVScannerConfig
    ) { }

    async scan(
        input: MaterialMalwareScanInput
    ): Promise<MaterialMalwareScanResult> {

        // 1. Kiểm tra dữ liệu đầu vào.
        if (
            !Buffer.isBuffer(input.content) ||
            input.content.length === 0 ||
            input.content.length > MAX_SCAN_BYTES ||
            !Number.isSafeInteger(input.timeoutMs) ||
            input.timeoutMs <= 0 ||
            input.timeoutMs > MAX_SCAN_TIMEOUT_MS
        ) {
            return {
                status: "failed",
                errorCode: "INVALID_SCAN_INPUT",
                errorMessage: "Invalid scan input.",
            };
        }

        // 2. Kiểm tra cấu hình kết nối.
        if (
            !this.config.host?.trim() ||
            !Number.isInteger(this.config.port) ||
            this.config.port < 1 ||
            this.config.port > 65535 ||
            !this.config.scannerVersion?.trim()
        ) {
            return {
                status: "failed",
                errorCode: "INVALID_SCANNER_CONFIG",
                errorMessage: "Invalid ClamAV configuration.",
            };
        }

        return new Promise<MaterialMalwareScanResult>((resolve) => {
            const socket = new net.Socket();

            let settled = false;
            let sendingComplete = false;

            // Tích lũy phản hồi có giới hạn.
            let response = Buffer.alloc(0);

            /**
             * Hoàn thành phiên quét đúng một lần.
             *
             * Mọi nhánh clean, infected hoặc failed
             * đều phải đi qua hàm này.
             */
            const timers: {
                deadline?: ReturnType<typeof setTimeout>;
            } = {};
            const finish = (result: MaterialMalwareScanResult) => {
                if (settled) return;

                settled = true;

                // Giải phóng timer khi phiên quét kết thúc.
                if (timers.deadline !== undefined) {
                    clearTimeout(timers.deadline);
                }
                // Đóng kết nối và hủy dữ liệu đang chờ gửi.
                socket.destroy();

                resolve(result);
            };

            /**
             * Thất bại theo nguyên tắc fail-closed.
             */
            const fail = (
                errorCode: string,
                errorMessage: string
            ) => {
                finish({
                    status: "failed",
                    errorCode,
                    errorMessage,
                });
            };

            /**
             * Gửi một Buffer và chờ backpressure nếu cần.
             *
             * Nếu socket.write() trả false, chỉ tiếp tục
             * sau khi socket phát sự kiện drain.
             */
            const writeBuffer = (data: Buffer): Promise<void> => {
                return new Promise<void>((resolveWrite, rejectWrite) => {
                    if (settled || socket.destroyed) {
                        rejectWrite(new Error("SCANNER_SOCKET_CLOSED"));
                        return;
                    }

                    let completed = false;

                    const cleanup = () => {
                        socket.off("drain", onDrain);
                        socket.off("close", onClose);
                        socket.off("error", onError);
                    };

                    const succeed = () => {
                        if (completed) return;
                        completed = true;
                        cleanup();
                        resolveWrite();
                    };

                    const reject = (code: string) => {
                        if (completed) return;
                        completed = true;
                        cleanup();
                        rejectWrite(new Error(code));
                    };

                    const onDrain = () => succeed();

                    const onClose = () => {
                        reject("SCANNER_SOCKET_CLOSED");
                    };

                    const onError = () => {
                        reject("SCANNER_SOCKET_ERROR");
                    };

                    // Theo dõi lỗi trong lúc chờ socket.
                    socket.on("close", onClose);
                    socket.on("error", onError);

                    try {
                        // Đăng ký trước để tránh bỏ lỡ sự kiện drain.
                        socket.once("drain", onDrain);

                        const writable = socket.write(data);

                        if (writable) {
                            // Không cần chờ drain.
                            succeed();
                        }
                    } catch {
                        reject("SCANNER_SOCKET_WRITE_FAILED");
                    }
                });
            };

            /**
             * Gửi toàn bộ dữ liệu bằng giao thức zINSTREAM.
             */
            const sendFile = async () => {
                // 3. Gửi lệnh bắt đầu quét.
                await writeBuffer(INSTREAM_COMMAND);

                // 4. Gửi lần lượt các chunk.
                for (
                    let offset = 0;
                    offset < input.content.length;
                    offset += CHUNK_SIZE
                ) {
                    if (settled) return;

                    const chunk = input.content.subarray(
                        offset,
                        Math.min(
                            offset + CHUNK_SIZE,
                            input.content.length
                        )
                    );

                    // ClamAV yêu cầu độ dài chunk dạng UInt32BE.
                    const header = Buffer.alloc(4);
                    header.writeUInt32BE(chunk.length, 0);

                    await writeBuffer(header);
                    await writeBuffer(chunk);
                }

                if (settled) return;

                // 5. Gửi chunk rỗng kết thúc INSTREAM.
                await writeBuffer(END_MARKER);

                // Đã gửi toàn bộ dữ liệu vào socket.
                sendingComplete = true;
            };

            /**
             * Xử lý phản hồi từ ClamAV.
             *
             * Chỉ "stream: OK" mới được coi là sạch.
             */
            const processResponse = (message: string) => {
                if (!sendingComplete) {
                    fail(
                        "SCANNER_PROTOCOL_ERROR",
                        "Scanner responded before upload completed."
                    );
                    return;
                }

                const scannedAt = new Date();
                const scannerVersion = this.config.scannerVersion;

                if (message === "stream: OK") {
                    finish({
                        status: "clean",
                        scannerVersion,
                        scannedAt,
                    });
                    return;
                }

                // Tên mã độc không được chứa ký tự điều khiển.
                const infectedMatch =
                    /^stream: ([^\x00-\x1f\x7f]+) FOUND$/.exec(message);

                if (infectedMatch) {
                    finish({
                        status: "infected",
                        scannerVersion,
                        scannedAt,
                        threatName: infectedMatch[1],
                    });
                    return;
                }

                // ERROR, phản hồi lạ hoặc không xác định.
                fail(
                    "SCANNER_REJECTED",
                    "ClamAV returned an error or unknown response."
                );
            };

            // 6. Deadline tuyệt đối, không phụ thuộc socket activity.
            timers.deadline = setTimeout(() => {
                fail(
                    "SCAN_TIMEOUT",
                    "ClamAV scan exceeded the allowed deadline."
                );
            }, input.timeoutMs);

            // 7. Xử lý lỗi kết nối.
            socket.on("error", () => {
                fail(
                    "SCANNER_CONNECTION_ERROR",
                    "Cannot communicate with ClamAV."
                );
            });

            // 8. Kết nối bị đóng trước khi có kết quả.
            socket.on("close", () => {
                if (!settled) {
                    fail(
                        "SCANNER_CONNECTION_CLOSED",
                        "ClamAV closed the connection unexpectedly."
                    );
                }
            });

            // 9. Đọc phản hồi với giới hạn dung lượng.
            socket.on("data", (chunk: Buffer) => {
                if (settled) return;

                if (
                    response.length + chunk.length >
                    MAX_RESPONSE_BYTES
                ) {
                    fail(
                        "SCANNER_RESPONSE_TOO_LARGE",
                        "ClamAV response exceeded the allowed size."
                    );
                    return;
                }

                response = Buffer.concat([response, chunk]);

                // Phản hồi zINSTREAM kết thúc bằng NUL.
                const terminatorIndex = response.indexOf(0);

                if (terminatorIndex === -1) {
                    return;
                }

                // Không chấp nhận dữ liệu thừa sau NUL.
                if (terminatorIndex !== response.length - 1) {
                    fail(
                        "SCANNER_PROTOCOL_ERROR",
                        "Unexpected trailing scanner data."
                    );
                    return;
                }

                const message = response
                    .subarray(0, terminatorIndex)
                    .toString("utf8");

                processResponse(message);
            });

            // 10. Kết nối và bắt đầu truyền dữ liệu.
            socket.connect(
                this.config.port,
                this.config.host,
                () => {
                    if (settled) return;

                    void sendFile().catch(() => {
                        if (!settled) {
                            fail(
                                "SCANNER_WRITE_FAILED",
                                "Failed to send file to ClamAV."
                            );
                        }
                    });
                }
            );
        });
    }
}

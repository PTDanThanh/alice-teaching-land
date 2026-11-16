import assert from "node:assert/strict";
import net from "node:net";
import { after, test } from "node:test";

import { ClamAVMaterialScanner } from "../lib/material-clamav-scanner";

type MockResponse = string | null;

const servers: net.Server[] = [];
const activeSockets = new Set<net.Socket>();

/**
 * Tạo TCP server giả lập clamd.
 *
 * Server đọc lệnh zINSTREAM, từng chunk và end marker.
 * Chỉ phản hồi khi đã nhận đủ nội dung file.
 */
async function createMockClamAV(
    response: MockResponse,
    onFile?: (content: Buffer) => void
): Promise<number> {
    const server = net.createServer((socket) => {
        // Theo dõi socket để đóng khi kết thúc kiểm thử.
        activeSockets.add(socket);
        socket.on("close", () => activeSockets.delete(socket));

        let pending = Buffer.alloc(0);
        let started = false;
        let completed = false;
        const chunks: Buffer[] = [];

        socket.on("data", (data: Buffer) => {
            if (completed) return;

            pending = Buffer.concat([pending, data]);

            // Kiểm tra lệnh bắt đầu giao thức zINSTREAM.
            if (!started) {
                const command = Buffer.from("zINSTREAM\0", "ascii");
                if (pending.length < command.length) return;

                if (!pending.subarray(0, command.length).equals(command)) {
                    socket.destroy();
                    return;
                }

                pending = pending.subarray(command.length);
                started = true;
            }

            // Đọc các chunk, mỗi chunk có header 4 byte UInt32BE.
            while (pending.length >= 4) {
                const length = pending.readUInt32BE(0);

                // End marker: chunk có độ dài bằng 0.
                if (length === 0) {
                    completed = true;
                    onFile?.(Buffer.concat(chunks));

                    // null mô phỏng daemon không gửi phản hồi.
                    if (response !== null) {
                        socket.end(`${response}\0`);
                    }
                    return;
                }

                if (pending.length < length + 4) return;

                chunks.push(Buffer.from(pending.subarray(4, length + 4)));
                pending = pending.subarray(length + 4);
            }
        });
    });

    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.off("error", reject);
            resolve();
        });
    });

    servers.push(server);
    const address = server.address();

    if (!address || typeof address === "string") {
        throw new Error("MOCK_SERVER_ADDRESS_INVALID");
    }

    return address.port;
}

function createScanner(port: number) {
    return new ClamAVMaterialScanner({
        host: "127.0.0.1",
        port,
        scannerVersion: "mock-clamav-test",
    });
}

// net.Server không hỗ trợ closeAllConnections() (chỉ http.Server có).
after(async () => {
    // Đóng các socket đang mở trước khi đóng TCP server.
    for (const socket of activeSockets) {
        socket.destroy();
    }
    activeSockets.clear();

    await Promise.all(
        servers.map(
            (server) =>
                new Promise<void>((resolve) => {
                    server.close(() => resolve());
                })
        )
    );
});

test("ClamAV returns clean for OK", async () => {
    const port = await createMockClamAV("stream: OK");
    const result = await createScanner(port).scan({
        content: Buffer.from("safe test document"),
        originalName: "test.pdf",
        timeoutMs: 3000,
    });

    assert.equal(result.status, "clean");
});

test("ClamAV detects infected content", async () => {
    const port = await createMockClamAV(
        "stream: Eicar-Test-Signature FOUND"
    );

    const result = await createScanner(port).scan({
        content: Buffer.from("sample"),
        originalName: "test.pdf",
        timeoutMs: 3000,
    });

    assert.equal(result.status, "infected");
    if (result.status === "infected") {
        assert.equal(result.threatName, "Eicar-Test-Signature");
    }
});

test("ClamAV errors fail closed", async () => {
    const port = await createMockClamAV("stream: ERROR");
    const result = await createScanner(port).scan({
        content: Buffer.from("sample"),
        originalName: "test.pdf",
        timeoutMs: 3000,
    });

    assert.equal(result.status, "failed");
});

test("ClamAV rejects invalid responses", async () => {
    const port = await createMockClamAV("unexpected response");
    const result = await createScanner(port).scan({
        content: Buffer.from("sample"),
        originalName: "test.pdf",
        timeoutMs: 3000,
    });

    assert.equal(result.status, "failed");
});

test("ClamAV times out when no response", async () => {
    const port = await createMockClamAV(null);
    const result = await createScanner(port).scan({
        content: Buffer.from("sample"),
        originalName: "test.pdf",
        timeoutMs: 100,
    });

    assert.equal(result.status, "failed");
    if (result.status === "failed") {
        assert.equal(result.errorCode, "SCAN_TIMEOUT");
    }
});

test("ClamAV rejects oversized files", async () => {
    // Không cần mở kết nối: adapter phải từ chối trước khi connect.
    const result = await createScanner(3310).scan({
        content: Buffer.alloc(20 * 1024 * 1024 + 1),
        originalName: "oversized.pdf",
        timeoutMs: 3000,
    });

    assert.equal(result.status, "failed");
    if (result.status === "failed") {
        assert.equal(result.errorCode, "INVALID_SCAN_INPUT");
    }
});

test("ClamAV sends the exact file bytes across multiple chunks", async () => {
    const content = Buffer.alloc(200_000, 0x41);
    let received: Buffer | undefined;

    const port = await createMockClamAV("stream: OK", (buffer) => {
        received = buffer;
    });

    const result = await createScanner(port).scan({
        content,
        originalName: "large.pdf",
        timeoutMs: 3000,
    });

    assert.equal(result.status, "clean");
    assert.deepEqual(received, content);
});

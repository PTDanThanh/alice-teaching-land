
import "server-only";
import { Readable } from "node:stream";
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,

} from "@aws-sdk/client-s3";

import { randomUUID } from "node:crypto";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// =====================================================
// 1. CẤU HÌNH CLOUDFLARE R2
// =====================================================

// Giới hạn dung lượng file: 20 MB
export const MAX_MATERIAL_FILE_SIZE = 20 * 1024 * 1024;

// =====================================================
// KIỂM TRA OBJECT KEY TRÊN CLOUDFLARE R2
// =====================================================

// staging: File mới upload, chưa được kiểm tra bảo mật.
// verified: File đã vượt qua kiểm tra và được chấp nhận.
// original: Hỗ trợ tài liệu cũ để tránh lỗi khi chuyển đổi.
// preview: File PDF được tạo để xem trước tài liệu.
const MATERIAL_KEY_PATTERN =
    /^materials\/(?:staging|verified|original|preview)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:pdf|doc|docx|ppt|pptx)$/i;


// =====================================================
// TẠO OBJECT KEY CHO VÙNG CÁCH LY (STAGING)
// =====================================================

// Chỉ hỗ trợ các định dạng tài liệu được hệ thống cho phép.
const ALLOWED_MATERIAL_EXTENSIONS = new Set([
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
]);

// Tạo object key ngẫu nhiên cho file chưa kiểm tra.
// Không sử dụng tên file gốc để tránh path traversal.
export function createMaterialStagingKey(
    extension: string
): string {
    const normalizedExtension = extension.toLowerCase();

    if (!ALLOWED_MATERIAL_EXTENSIONS.has(normalizedExtension)) {
        throw new Error("Định dạng tài liệu không được hỗ trợ.");
    }

    return `materials/staging/${randomUUID()}${normalizedExtension}`;
}


/**
 * Tạo object key cho tài liệu đã được quét bảo mật.
 *
 * Lưu ý:
 * - Hàm chỉ tạo đường dẫn, không tự quét virus.
 * - Không cấp quyền upload trực tiếp vào verified cho client.
 * - Chỉ scanner/backend tin cậy được ghi file vào verified.
 */
export function createMaterialVerifiedKey(
    extension: string
): string {
    // Chuẩn hóa phần mở rộng của tài liệu.
    const normalizedExtension = extension.toLowerCase();

    // Chỉ cho phép những định dạng đã được hỗ trợ.
    if (!ALLOWED_MATERIAL_EXTENSIONS.has(normalizedExtension)) {
        throw new Error("MATERIAL_UNSUPPORTED_EXTENSION");
    }

    // Mỗi file được cấp một object key ngẫu nhiên.
    return `materials/verified/${randomUUID()}${normalizedExtension}`;
}


// =====================================================
// TẠO OBJECT KEY CHO POWERPOINT PDF PREVIEW
// =====================================================

// Mỗi lần chuyển đổi PowerPoint sẽ tạo một PDF Preview mới.
// Không ghi đè PDF cũ để tránh xung đột khi cập nhật tài liệu.
export function createPowerPointPreviewKey(): string {
    return `materials/preview/${randomUUID()}.pdf`;
}

// Kiểm tra định dạng object key
export function isValidMaterialKey(key: string): boolean {
    return MATERIAL_KEY_PATTERN.test(key);
}

// Đọc biến môi trường và báo lỗi nếu thiếu
function getR2Config() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
        throw new Error("Thiếu cấu hình Cloudflare R2.");
    }

    return {
        accountId,
        accessKeyId,
        secretAccessKey,
        bucket,
    };
}

// =====================================================
// 2. KHỞI TẠO R2 CLIENT
// =====================================================

// Tái sử dụng client để tránh tạo kết nối không cần thiết
let client: S3Client | undefined;

// Export để các API Route có thể sử dụng
export function getR2Client(): S3Client {
    if (!client) {
        const config = getR2Config();

        client = new S3Client({
            region: "auto",

            // Endpoint S3-compatible của Cloudflare R2
            endpoint:
                `https://${config.accountId}.r2.cloudflarestorage.com`,

            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            // Không tự động bổ sung checksum cho request PUT thông thường
            requestChecksumCalculation: "WHEN_REQUIRED",
            responseChecksumValidation: "WHEN_REQUIRED",
        });
    }

    return client;
}

// Lấy tên bucket từ biến môi trường
export function getR2Bucket(): string {
    return getR2Config().bucket;
}

// Kiểm tra key trước khi thao tác với R2
function assertMaterialKey(key: string): void {
    if (!isValidMaterialKey(key)) {
        throw new Error("Object key tài liệu không hợp lệ.");
    }
}

// =====================================================
// 3. UPLOAD FILE LÊN R2
// =====================================================

// Upload trực tiếp từ backend lên R2.
// Hàm này hữu ích cho file PDF preview được tạo bởi worker.
// Với file gốc, frontend sẽ dùng Presigned PUT URL.
export async function uploadMaterialObject(
    key: string,
    buffer: Buffer,
    contentType: string
): Promise<string> {
    assertMaterialKey(key);

    if (
        buffer.length === 0 ||
        buffer.length > MAX_MATERIAL_FILE_SIZE
    ) {
        throw new Error("Dung lượng file không hợp lệ.");
    }

    await getR2Client().send(
        new PutObjectCommand({
            Bucket: getR2Bucket(),
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: "private, no-store",
        })
    );

    return key;
}

/**
 * BƯỚC 11A:
 * Ghi Buffer vào vùng Verified trên Cloudflare R2.
 *
 * Quy tắc:
 * - Chỉ cho phép object key thuộc materials/verified/.
 * - Không chấp nhận Buffer rỗng hoặc vượt 20 MiB.
 * - Không ghi đè object đã tồn tại.
 * - Không cấp quyền public hoặc signed URL.
 *
 * Lưu ý:
 * Hàm này chỉ thực hiện lưu trữ.
 * Việc xác minh file đã sạch virus thuộc Bước 11B.
 */
export async function uploadVerifiedMaterialObject(
    key: string,
    buffer: Buffer,
    contentType: string
): Promise<string> {
    // 1. Kiểm tra object key đúng định dạng UUID và extension.
    assertMaterialKey(key);

    // 2. Chỉ cho phép ghi vào vùng Verified.
    if (!key.startsWith("materials/verified/")) {
        throw new Error("MATERIAL_NOT_VERIFIED_KEY");
    }

    // 3. Giới hạn kích thước Buffer.
    if (
        buffer.length === 0 ||
        buffer.length > MAX_MATERIAL_FILE_SIZE
    ) {
        throw new Error("MATERIAL_INVALID_FILE_SIZE");
    }

    // 4. Kiểm tra Content-Type.
    if (
        !contentType ||
        typeof contentType !== "string" ||
        contentType.length > 255
    ) {
        throw new Error("MATERIAL_INVALID_CONTENT_TYPE");
    }

    // 5. Ghi object mới, không cho ghi đè object đã tồn tại.
    // R2 phải thực sự hỗ trợ If-None-Match: * cho PUT.
    // Cần kiểm thử tích hợp để xác minh hành vi này.
    await getR2Client().send(
        new PutObjectCommand({
            Bucket: getR2Bucket(),
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: "private, no-store",
            IfNoneMatch: "*",
        })
    );

    return key;
}

// =====================================================
// 4. KIỂM TRA FILE ĐÃ UPLOAD
// =====================================================

// Kiểm tra object thực sự tồn tại trên Cloudflare R2.
// Dùng sau khi frontend hoàn tất upload bằng Presigned URL.
export async function verifyMaterialObject(
    key: string,
    expectedSize?: number
): Promise<{
    exists: boolean;
    size: number | null;
    contentType: string | null;
}> {
    assertMaterialKey(key);

    try {
        const result = await getR2Client().send(
            new HeadObjectCommand({
                Bucket: getR2Bucket(),
                Key: key,
            })
        );

        const size = result.ContentLength ?? null;
        const contentType = result.ContentType ?? null;

        // Không chấp nhận file rỗng hoặc vượt quá 20 MB
        if (
            size === null ||
            size <= 0 ||
            size > MAX_MATERIAL_FILE_SIZE
        ) {
            return {
                exists: false,
                size,
                contentType,
            };
        }

        // Nếu có kích thước dự kiến, kiểm tra phải khớp
        if (
            expectedSize !== undefined &&
            size !== expectedSize
        ) {
            return {
                exists: false,
                size,
                contentType,
            };
        }

        return {
            exists: true,
            size,
            contentType,
        };
    } catch (error) {
        // File không tồn tại
        if (
            error instanceof Error &&
            (error.name === "NotFound" ||
                error.name === "NoSuchKey")
        ) {
            return {
                exists: false,
                size: null,
                contentType: null,
            };
        }

        // Lỗi kết nối, phân quyền... phải được xử lý riêng
        throw error;
    }
}


// =====================================================
// ĐỌC FILE TỪ VÙNG CÁCH LY ĐỂ KIỂM TRA BẢO MẬT
// =====================================================

/**
 * Đọc file từ Cloudflare R2 để kiểm tra bảo mật.
 *
 * - Chỉ chấp nhận file trong vùng staging.
 * - Giới hạn dữ liệu thực tế đọc tối đa 20 MB.
 * - Không trả nội dung file trực tiếp cho frontend.
 * - Không tự động đánh dấu file là an toàn.
 */
export async function readMaterialObjectForScanning(
    key: string
): Promise<Buffer> {
    // Kiểm tra cấu trúc object key.
    assertMaterialKey(key);

    // Không cho dùng hàm quét để đọc file ngoài staging.
    if (!key.startsWith("materials/staging/")) {
        throw new Error("MATERIAL_NOT_IN_STAGING");
    }

    // Lấy nội dung file từ R2.
    const result = await getR2Client().send(
        new GetObjectCommand({
            Bucket: getR2Bucket(),
            Key: key,
        })
    );

    if (!result.Body) {
        throw new Error("MATERIAL_OBJECT_EMPTY");
    }

    // Kiểm tra kích thước khai báo nếu R2 cung cấp.
    if (
        result.ContentLength !== undefined &&
        result.ContentLength > MAX_MATERIAL_FILE_SIZE
    ) {
        throw new Error("MATERIAL_FILE_TOO_LARGE");
    }


    // =====================================================
    // ĐỌC STREAM VỚI GIỚI HẠN BỘ NHỚ
    // =====================================================

    // Chỉ xử lý Node.js Readable stream.
    // Không sử dụng transformToByteArray() vì hàm đó
    // có thể tải toàn bộ file vào RAM trước khi kiểm tra.
    const body = result.Body;

    if (!(body instanceof Readable)) {
        throw new Error("MATERIAL_INVALID_STREAM");
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;

    try {
        // Đọc từng phần dữ liệu thay vì tải toàn bộ file.
        for await (const chunk of body) {
            const buffer = Buffer.isBuffer(chunk)
                ? chunk
                : Buffer.from(chunk as Uint8Array);

            totalSize += buffer.length;

            // Ngừng đọc ngay khi vượt giới hạn 20 MB.
            if (totalSize > MAX_MATERIAL_FILE_SIZE) {
                throw new Error("MATERIAL_FILE_TOO_LARGE");
            }

            chunks.push(buffer);
        }
    } catch (error) {
        // Hủy stream nếu đọc thất bại hoặc file quá lớn.
        body.destroy();
        throw error;
    }

    if (totalSize === 0) {
        throw new Error("MATERIAL_OBJECT_EMPTY");
    }

    // Chỉ ghép Buffer sau khi đã kiểm tra dung lượng.
    return Buffer.concat(chunks, totalSize);

}


// =====================================================
// 5. TẠO URL XEM / TẢI TÀI LIỆU
// =====================================================

// Tạo URL có thời hạn, mặc định 5 phút.
// Không lưu URL này vào MongoDB vì nó sẽ hết hạn.
export async function getMaterialSignedUrl(
    key: string,
    expiresIn = 300
): Promise<string> {
    assertMaterialKey(key);
    // Không cấp URL tải hoặc xem file đang cách ly.
    if (key.startsWith("materials/staging/")) {
        throw new Error("MATERIAL_NOT_VERIFIED");
    }

    if (
        !Number.isInteger(expiresIn) ||
        expiresIn < 1 ||
        expiresIn > 3600
    ) {
        throw new Error("Thời hạn URL không hợp lệ.");
    }

    return getSignedUrl(
        getR2Client(),
        new GetObjectCommand({
            Bucket: getR2Bucket(),
            Key: key,
        }),
        { expiresIn }
    );
}

// =====================================================
// 6. XÓA FILE KHỎI R2
// =====================================================

// Chỉ gọi sau khi đã xác minh file có thể được xóa.
// Ví dụ: không còn tài liệu nào tham chiếu đến key này.
export async function deleteMaterialObject(
    key: string
): Promise<void> {
    assertMaterialKey(key);

    await getR2Client().send(
        new DeleteObjectCommand({
            Bucket: getR2Bucket(),
            Key: key,
        })
    );
}

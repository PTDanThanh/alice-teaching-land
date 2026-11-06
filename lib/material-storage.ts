
import "server-only";

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

// Chỉ chấp nhận object key do hệ thống tạo ra
const MATERIAL_KEY_PATTERN =
    /^materials\/(?:original|preview)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:pdf|doc|docx|ppt|pptx)$/i;

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
// 5. TẠO URL XEM / TẢI TÀI LIỆU
// =====================================================

// Tạo URL có thời hạn, mặc định 5 phút.
// Không lưu URL này vào MongoDB vì nó sẽ hết hạn.
export async function getMaterialSignedUrl(
    key: string,
    expiresIn = 300
): Promise<string> {
    assertMaterialKey(key);

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

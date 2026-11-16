import "server-only";
// Đọc nội dung file từ vùng cách ly trên Cloudflare R2.
import {
    MAX_MATERIAL_FILE_SIZE,
    readMaterialObjectForScanning,
} from "@/lib/material-storage";

import { createHash } from "node:crypto";
import path from "node:path";

// =====================================================
// 1. CÁC ĐỊNH DẠNG ĐƯỢC HỖ TRỢ
// =====================================================

export type MaterialFileExtension =
    | ".pdf"
    | ".doc"
    | ".docx"
    | ".ppt"
    | ".pptx";

const ALLOWED_EXTENSIONS = new Set<MaterialFileExtension>([
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
]);

// PDF: %PDF-
const PDF_SIGNATURE = Buffer.from([
    0x25, 0x50, 0x44, 0x46, 0x2d,
]);

// ZIP: PK\x03\x04
// DOCX và PPTX đều sử dụng định dạng ZIP/OOXML.
const ZIP_SIGNATURE = Buffer.from([
    0x50, 0x4b, 0x03, 0x04,
]);

// OLE Compound File: DOC/PPT đời cũ.
const OLE_SIGNATURE = Buffer.from([
    0xd0, 0xcf, 0x11, 0xe0,
    0xa1, 0xb1, 0x1a, 0xe1,
]);

// =====================================================
// 2. KIỂM TRA CHỮ KÝ FILE
// =====================================================

function hasSignature(
    buffer: Buffer,
    signature: Buffer
): boolean {
    return (
        buffer.length >= signature.length &&
        buffer.subarray(0, signature.length).equals(signature)
    );
}

// Kiểm tra sơ bộ định dạng dựa trên magic bytes.
// Chưa thay thế việc phân tích cấu trúc và quét virus.
export function validateMaterialFileSignature(
    buffer: Buffer,
    filename: string
): {
    valid: boolean;
    extension: MaterialFileExtension | null;
    reason?: string;
} {
    const extension = path.extname(filename).toLowerCase();

    if (
        !ALLOWED_EXTENSIONS.has(
            extension as MaterialFileExtension
        )
    ) {
        return {
            valid: false,
            extension: null,
            reason: "Định dạng tài liệu không được hỗ trợ.",
        };
    }

    if (buffer.length === 0) {
        return {
            valid: false,
            extension: extension as MaterialFileExtension,
            reason: "File không có nội dung.",
        };
    }

    let valid = false;

    switch (extension) {
        case ".pdf":
            valid = hasSignature(buffer, PDF_SIGNATURE);
            break;

        case ".docx":
        case ".pptx":
            valid = hasSignature(buffer, ZIP_SIGNATURE);
            break;

        case ".doc":
        case ".ppt":
            valid = hasSignature(buffer, OLE_SIGNATURE);
            break;
    }

    return {
        valid,
        extension: extension as MaterialFileExtension,
        ...(!valid
            ? { reason: "Nội dung file không khớp với phần mở rộng." }
            : {}),
    };
}

// =====================================================
// 3. TÍNH CHECKSUM SHA-256
// =====================================================

// Dùng checksum để xác định nội dung file đã kiểm tra.
// Không dùng checksum làm bằng chứng file không có virus.
export function calculateMaterialChecksum(
    buffer: Buffer
): string {
    return createHash("sha256")
        .update(buffer)
        .digest("hex");
}


// =====================================================
// 4. KIỂM TRA FILE TRONG VÙNG CÁCH LY
// =====================================================

export type MaterialFileInspectionResult = {
    // Object key của file đang kiểm tra.
    objectKey: string;

    // Phần mở rộng được xác định từ tên file.
    extension: MaterialFileExtension;

    // Dung lượng thực tế của file.
    fileSize: number;

    // SHA-256 của nội dung thực tế đã đọc.
    checksum: string;

    // Kết quả kiểm tra chữ ký định dạng.
    signatureValid: true;
};

/**
 * Kiểm tra sơ bộ nội dung file đã upload lên staging.
 *
 * Lưu ý:
 * - Không quét virus.
 * - Không cập nhật trạng thái clean trong MongoDB.
 * - Không chuyển file sang verified.
 */
export async function inspectStagedMaterialFile(
    objectKey: string,
    originalName: string,
    expectedSize: number
): Promise<MaterialFileInspectionResult> {
    // 1. Kiểm tra dung lượng khai báo trước khi đọc R2.
    if (
        !Number.isSafeInteger(expectedSize) ||
        expectedSize <= 0 ||
        expectedSize > MAX_MATERIAL_FILE_SIZE
    ) {
        throw new Error("MATERIAL_INVALID_EXPECTED_SIZE");
    }

    // 2. Kiểm tra object key thuộc vùng staging.
    if (!objectKey.startsWith("materials/staging/")) {
        throw new Error("MATERIAL_NOT_IN_STAGING");
    }

    // 3. Đối chiếu phần mở rộng của tên gốc và object key.
    const originalExtension = path.extname(originalName).toLowerCase();
    const objectExtension = path.extname(objectKey).toLowerCase();

    if (
        !ALLOWED_EXTENSIONS.has(
            originalExtension as MaterialFileExtension
        ) ||
        originalExtension !== objectExtension
    ) {
        throw new Error("MATERIAL_EXTENSION_MISMATCH");
    }

    // 4. Đọc nội dung thực tế từ R2.
    // Hàm này phải giới hạn số byte trong lúc đọc stream.
    const buffer = await readMaterialObjectForScanning(objectKey);

    // 5. Kiểm tra kích thước thực tế.
    if (buffer.length !== expectedSize) {
        throw new Error("MATERIAL_FILE_SIZE_MISMATCH");
    }

    // 6. Kiểm tra magic bytes.
    const signature = validateMaterialFileSignature(
        buffer,
        originalName
    );

    if (!signature.valid || !signature.extension) {
        throw new Error(
            signature.reason ?? "MATERIAL_INVALID_FILE_SIGNATURE"
        );
    }

    // 7. Tính SHA-256 trên chính nội dung vừa kiểm tra.
    const checksum = calculateMaterialChecksum(buffer);

    // 8. Trả về metadata phục vụ bước quét mã độc.
    return {
        objectKey,
        extension: signature.extension,
        fileSize: buffer.length,
        checksum,
        signatureValid: true,
    };
}

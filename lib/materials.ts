
import mongoose from "mongoose";
import "server-only";

import { getCurrentSessionUser } from "@/lib/auth/session";

import type {
    Material,
    MaterialFormat,
    MaterialLanguage,
    MaterialLevel,
    MaterialStatus,
} from "@/data/materials";

// =====================================================
// 1. KẾT NỐI MONGODB
// =====================================================

export async function connectMaterialsDB() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("Thiếu MONGODB_URI trong .env.local");
    }

    // Tránh tạo kết nối mới nếu đã kết nối MongoDB.
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(uri);
    }
}

// =====================================================
// 2. KIỂM TRA DỮ LIỆU TÀI LIỆU
// =====================================================

const languages: MaterialLanguage[] = ["en", "fr"];

const formats: MaterialFormat[] = [
    "word",
    "pdf",
    "powerpoint",
];

const levels: MaterialLevel[] = [
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2",
];

const statuses: MaterialStatus[] = [
    "published",
    "draft",
];

export function parseMaterial(
    input: unknown
): Omit<Material, "id" | "updatedAt"> | null {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return null;
    }

    const x = input as Record<string, unknown>;

    // Kiểm tra tên tài liệu
    if (
        typeof x.title !== "string" ||
        !x.title.trim() ||
        x.title.length > 300
    ) {
        return null;
    }

    // Kiểm tra mô tả
    if (
        typeof x.description !== "string" ||
        x.description.length > 5000
    ) {
        return null;
    }

    // Kiểm tra bộ sưu tập
    if (
        typeof x.collection !== "string" ||
        x.collection.length > 200
    ) {
        return null;
    }

    // Kiểm tra ngôn ngữ
    if (!languages.includes(x.language as MaterialLanguage)) {
        return null;
    }

    // Kiểm tra định dạng
    if (!formats.includes(x.type as MaterialFormat)) {
        return null;
    }

    // Kiểm tra trình độ
    if (!levels.includes(x.level as MaterialLevel)) {
        return null;
    }

    // Kiểm tra trạng thái
    if (!statuses.includes(x.status as MaterialStatus)) {
        return null;
    }

    // Kiểm tra tùy chọn hiển thị trang chủ
    if (typeof x.showOnHome !== "boolean") {
        return null;
    }

    // Kiểm tra đường dẫn file
    if (
        x.downloadUrl !== null &&
        typeof x.downloadUrl !== "string"
    ) {
        return null;
    }

    const downloadUrl =
        (x.downloadUrl as string | null)?.trim() || null;

    // Kiểm tra object key được tạo bởi hệ thống upload R2
    const R2_MATERIAL_KEY_PATTERN =
        /^materials\/original\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx|ppt|pptx)$/i;

    if (
        downloadUrl &&
        !R2_MATERIAL_KEY_PATTERN.test(downloadUrl)
    ) {
        return null;
    }

    // Kiểm tra định dạng file có phù hợp với loại tài liệu
    if (downloadUrl) {
        const extension = downloadUrl.split(".").pop()?.toLowerCase();

        const expectedType: Record<string, MaterialFormat> = {
            pdf: "pdf",
            doc: "word",
            docx: "word",
            ppt: "powerpoint",
            pptx: "powerpoint",
        };

        if (!extension || expectedType[extension] !== x.type) {
            return null;
        }
    }

    // Trả về dữ liệu đã kiểm tra
    return {
        title: x.title.trim(),
        description: x.description,
        collection: x.collection,
        language: x.language as MaterialLanguage,
        type: x.type as MaterialFormat,
        level: x.level as MaterialLevel,
        status: x.status as MaterialStatus,
        showOnHome: x.showOnHome,
        downloadUrl,
    };
}

// =====================================================
// 3. KIỂM TRA QUYỀN ADMIN


// Sử dụng hệ thống xác thực hiện tại của dự án.
// Đọc access token từ cookie và xác minh người dùng.
export async function canManageMaterials(): Promise<boolean> {
    try {
        const user = await getCurrentSessionUser();

        // Chưa đăng nhập hoặc phiên đăng nhập không hợp lệ
        if (!user) {
            return false;
        }

        // Chỉ tài khoản có role admin được quản lý tài liệu
        return user.role === "admin";
    } catch (error) {
        console.error("[Materials] Admin authorization failed:", error);

        return false;
    }
}
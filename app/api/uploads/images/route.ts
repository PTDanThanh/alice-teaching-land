import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { NextRequest } from "next/server";

import {
    AuthError,
    checkOrigin,
    errorResponse,
    json,
} from "@/lib/auth/http";
import { ACCESS_COOKIE } from "@/lib/auth/tokens";
import { currentUser } from "@/services/auth/auth.service";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export async function POST(request: NextRequest) {
    try {
        checkOrigin(request);

        const token = request.cookies.get(ACCESS_COOKIE)?.value;
        const user = await currentUser(token);

        if (user.role !== "admin") {
            throw new AuthError("Bạn không có quyền upload ảnh.", 403);
        }

        let formData: FormData;

        try {
            formData = await request.formData();
        } catch {
            throw new AuthError("Dữ liệu upload không hợp lệ.", 400);
        }

        const file = formData.get("file");

        if (!(file instanceof File)) {
            throw new AuthError("Vui lòng chọn một ảnh.", 400);
        }

        if (file.size === 0 || file.size > MAX_FILE_SIZE) {
            throw new AuthError("Ảnh phải có dung lượng từ 1 byte đến 5 MB.", 400);
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            throw new AuthError("Chỉ hỗ trợ ảnh JPG, PNG và WebP.", 400);
        }

        const input = Buffer.from(await file.arrayBuffer());

        let output: Buffer;

        try {
            const metadata = await sharp(input, {
                limitInputPixels: 40_000_000,
            }).metadata();

            // Kiểm tra định dạng thực tế, không chỉ dựa vào MIME từ client.
            if (
                !metadata.format ||
                !["jpeg", "png", "webp"].includes(metadata.format) ||
                (metadata.pages ?? 1) > 1
            ) {
                throw new Error("Unsupported image");
            }

            output = await sharp(input, {
                limitInputPixels: 40_000_000,
            })
                .rotate()
                .resize({
                    width: 1600,
                    height: 1600,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .webp({ quality: 85 })
                .toBuffer();
        } catch {
            throw new AuthError(
                "Không thể đọc ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP hợp lệ.",
                400,
            );
        }

        const filename = `${randomUUID()}.webp`;

        const directory = path.join(
            process.cwd(),
            "public",
            "uploads",
            "home",
        );

        await mkdir(directory, { recursive: true });

        await writeFile(path.join(directory, filename), output, {
            flag: "wx",
        });

        return json({
            success: true,
            message: "Đã upload ảnh.",
            data: {
                url: `/uploads/home/${filename}`,
            },
        });
    } catch (error) {
        return errorResponse(error);
    }
}
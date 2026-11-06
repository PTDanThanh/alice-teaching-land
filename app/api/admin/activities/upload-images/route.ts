
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

const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export async function POST(request: NextRequest) {
    try {
        // Kiểm tra nguồn request và quyền Admin
        checkOrigin(request);

        const token = request.cookies.get(ACCESS_COOKIE)?.value;
        const user = await currentUser(token);

        if (user.role !== "admin") {
            throw new AuthError("Bạn không có quyền upload ảnh.", 403);
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            throw new AuthError("Vui lòng chọn ảnh.", 400);
        }

        if (file.size === 0 || file.size > MAX_FILE_SIZE) {
            throw new AuthError("Ảnh không được vượt quá 5 MB.", 400);
        }

        if (!ALLOWED_TYPES.has(file.type)) {
            throw new AuthError("Chỉ hỗ trợ JPG, PNG và WebP.", 400);
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        let output: Buffer;

        try {
            // Kiểm tra nội dung ảnh thực tế
            const metadata = await sharp(buffer, {
                limitInputPixels: 40_000_000,
            }).metadata();

            if (
                !metadata.format ||
                !["jpeg", "png", "webp"].includes(metadata.format) ||
                (metadata.pages ?? 1) > 1
            ) {
                throw new Error("Invalid image");
            }

            // Tự động xoay, thu nhỏ và chuyển sang WebP
            output = await sharp(buffer, {
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
            throw new AuthError("File ảnh không hợp lệ.", 400);
        }

        const filename = `${randomUUID()}.webp`;

        // Lưu ảnh vào thư mục public/activities-post
        const directory = path.join(
            process.cwd(),
            "public",
            "activities-post",
        );

        await mkdir(directory, { recursive: true });

        await writeFile(
            path.join(directory, filename),
            output,
            { flag: "wx" },
        );

        return json({
            success: true,
            message: "Upload ảnh thành công.",
            data: {
                url: `/activities-post/${filename}`,
            },
        });
    } catch (error) {
        return errorResponse(error);
    }
}

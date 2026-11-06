import "server-only";

import { type NextRequest } from "next/server";
import { ZodError } from "zod";

import {
    AuthError,
    checkOrigin,
    errorResponse,
    json,
} from "@/lib/auth/http";
import { ACCESS_COOKIE } from "@/lib/auth/tokens";
import { currentUser } from "@/services/auth/auth.service";
import {
    getHomeContent,
    updateHomeHero,
    updateHomeIntro,
} from "@/src/services/content/page-content.service";


export const runtime = "nodejs";

/**
 * Kiểm tra access token, session và quyền admin.
 * ID admin lấy từ tài khoản đã xác thực, không lấy từ body.
 */
async function requireAdmin(request: NextRequest) {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    const user = await currentUser(accessToken);

    if (user.role !== "admin") {
        throw new AuthError(
            "Bạn không có quyền quản lý nội dung trang.",
            403,
        );
    }

    return user;
}

/**
 * GET /api/admin/pages/home
 * Đọc nội dung hiện tại để hiển thị trong form quản trị.
 */
export async function GET(request: NextRequest) {
    try {
        await requireAdmin(request);

        const content = await getHomeContent();

        return json({
            success: true,
            data: content,
        });
    } catch (error) {
        return errorResponse(error);
    }
}

/**
 * PATCH /api/admin/pages/home
 * Body: { hero: { ...toàn bộ trường của Banner } }
 */
export async function PATCH(request: NextRequest) {
    try {
        checkOrigin(request);

        const admin = await requireAdmin(request);

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            throw new AuthError("JSON không hợp lệ.", 400);
        }

        if (
            typeof body !== "object" ||
            body === null ||
            Array.isArray(body)
        ) {
            throw new AuthError("Dữ liệu không hợp lệ.", 400);
        }

        const input = body as Record<string, unknown>;
        const keys = Object.keys(input);

        // Mỗi lần lưu một phần, không nhận trường ngoài danh sách.
        if (
            keys.length !== 1 ||
            !["hero", "intro"].includes(keys[0])
        ) {
            throw new AuthError(
                "Mỗi yêu cầu chỉ được cập nhật Hero hoặc Intro.",
                400,
            );
        }

        const isHero = keys[0] === "hero";

        const data = isHero
            ? await updateHomeHero(input.hero, admin.id)
            : await updateHomeIntro(input.intro, admin.id);

        return json({
            success: true,
            message: isHero
                ? "Đã lưu nội dung Banner."
                : "Đã lưu dải ảnh.",
            data,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return json(
                {
                    success: false,
                    message: "Nội dung không hợp lệ.",
                    errors: error.issues,
                },
                400,
            );
        }

        return errorResponse(error);
    }
}
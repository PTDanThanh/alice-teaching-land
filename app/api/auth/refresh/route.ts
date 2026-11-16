
import type { NextRequest } from "next/server";

import {
    checkOrigin,
    errorResponse,
    json,
} from "@/lib/auth/http";

import {
    REFRESH_COOKIE,
    setAuthCookies,
} from "@/lib/auth/tokens";

import { refresh } from "@/services/auth/auth.service";

// Sử dụng Node.js runtime để tương thích với MongoDB/Mongoose.
export const runtime = "nodejs";

// Chỉ cho phép làm mới phiên bằng phương thức POST.
export async function POST(request: NextRequest) {
    try {
        // Kiểm tra Origin để hạn chế CSRF.
        checkOrigin(request);

        // Đọc refresh token từ HttpOnly cookie.
        // Không nhận refresh token từ request body.
        const refreshToken =
            request.cookies.get(REFRESH_COOKIE)?.value;

        // Gọi service hiện có để kiểm tra phiên
        // và xoay vòng refresh token.
        const result = await refresh(refreshToken);

        // Không trả access/refresh token trong JSON.
        const response = json({
            message: "Làm mới phiên đăng nhập thành công.",
            user: result.user,
        });

        // Thiết lập access cookie và refresh cookie mới.
        setAuthCookies(response, result);

        // Không cho cache response xác thực.
        response.headers.set("Cache-Control", "no-store");

        return response;
    } catch (error) {
        // Sử dụng cơ chế xử lý lỗi hiện có.
        const response = errorResponse(error);
        response.headers.set("Cache-Control", "no-store");
        return response;
    }
}

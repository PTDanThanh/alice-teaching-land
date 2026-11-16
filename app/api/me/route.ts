
import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@/services/auth/auth.service";
import {
  ACCESS_COOKIE,
  verifyAccessToken,
} from "@/lib/auth/tokens";
import { AuthError } from "@/lib/auth/http";

export async function GET(request: NextRequest) {
  try {
    const accessToken =
      request.cookies.get(ACCESS_COOKIE)?.value;

    // Giữ nguyên kiểm tra người dùng và MongoDB session.
    const user = await currentUser(accessToken);

    // Đọc thời điểm hết hạn từ JWT đã xác minh.
    const payload = accessToken
      ? await verifyAccessToken(accessToken)
      : null;

    if (!payload) {
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    return NextResponse.json(
      {
        user,
        accessExpiresAt: payload.expiresAt,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const status =
      error instanceof AuthError ? error.status : 500;

    return NextResponse.json(
      {
        message:
          status === 500
            ? "Không thể lấy thông tin tài khoản."
            : error instanceof Error
              ? error.message
              : "Bạn chưa đăng nhập.",
      },
      {
        status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

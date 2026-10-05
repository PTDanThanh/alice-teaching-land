import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@/services/auth/auth.service";
import { ACCESS_COOKIE } from "@/lib/auth/tokens";
import { AuthError } from "@/lib/auth/http";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(
      request.cookies.get(ACCESS_COOKIE)?.value,
    );

    return NextResponse.json(
      { user },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;

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
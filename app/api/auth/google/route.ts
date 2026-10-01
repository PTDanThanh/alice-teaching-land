import type { NextRequest } from "next/server";

import {
  AuthError,
  checkOrigin,
  errorResponse,
  json,
} from "@/lib/auth/http";
import { setAuthCookies } from "@/lib/auth/tokens";
import { authenticateWithGoogle } from "@/services/auth/google-auth.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);

    const contentType = request.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      throw new AuthError("Vui lòng gửi dữ liệu JSON.", 415);
    }

    const raw = await request.text();

    if (Buffer.byteLength(raw, "utf8") > 12_288) {
      throw new AuthError("Dữ liệu quá lớn.", 413);
    }

    let body: Record<string, unknown>;

    try {
      const value: unknown = JSON.parse(raw);

      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
      ) {
        throw new Error("Invalid body");
      }

      body = value as Record<string, unknown>;
    } catch {
      throw new AuthError("Dữ liệu không hợp lệ.", 400);
    }

    const result = await authenticateWithGoogle(body);

    const response = json({
      message: "Đăng nhập Google thành công.",
      user: result.user,
    });

    setAuthCookies(response, result);

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
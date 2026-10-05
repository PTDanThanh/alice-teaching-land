import type { NextRequest } from "next/server";

import {
  AuthError,
  checkOrigin,
  errorResponse,
  json,
} from "@/lib/auth/http";
import { setAuthCookies } from "@/lib/auth/tokens";
import { login } from "@/services/auth/auth.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);

    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      throw new AuthError("Vui lòng gửi dữ liệu JSON.", 415);
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 12_288) {
      throw new AuthError("Dữ liệu quá lớn.", 413);
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid body");
      }
      body = parsed as Record<string, unknown>;
    } catch {
      throw new AuthError("Dữ liệu không hợp lệ.", 400);
    }

    const result = await login(body);
    const response = json({ user: result.user });
    setAuthCookies(response, result);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

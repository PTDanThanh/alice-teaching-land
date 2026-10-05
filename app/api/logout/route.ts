import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

import {
  checkOrigin,
  errorResponse,
  json,
} from "@/lib/auth/http";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
} from "@/lib/auth/tokens";
import { logout } from "@/services/auth/auth.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const cookieStore = await cookies();
    await logout(
      cookieStore.get(REFRESH_COOKIE)?.value,
      cookieStore.get(ACCESS_COOKIE)?.value,
    );

    const response = json({ message: "Đã đăng xuất." });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
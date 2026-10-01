import "server-only";

import { NextResponse, type NextRequest } from "next/server";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function checkOrigin(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error("Missing NEXT_PUBLIC_SITE_URL");
  }

  if (request.headers.get("origin") !== new URL(siteUrl).origin) {
    throw new AuthError("Nguồn gửi yêu cầu không hợp lệ.", 403);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return json({ message: error.message }, error.status);
  }

  console.error(
    "Auth server error:",
    error instanceof Error ? error.name : "UnknownError",
  );

  return json({ message: "Server gặp sự cố. Vui lòng thử lại." }, 500);
}
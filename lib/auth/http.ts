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
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin) {
    return;
  }

  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

  const expectedOrigin = new URL(configuredSiteUrl).origin;
  const requestOrigin = new URL(origin);

  const isSameConfiguredOrigin = requestOrigin.origin === expectedOrigin;
  const isSameHost = host ? requestOrigin.host === host : false;
  const isLocalhost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
    requestOrigin.hostname,
  );

  if (isSameConfiguredOrigin || isSameHost || isLocalhost) {
    return;
  }

  throw new AuthError("Nguồn gửi yêu cầu không hợp lệ.", 403);
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return json({ message: error.message }, error.status);
  }

  console.error("Auth server error:", error);

  return json({ message: "Server gặp sự cố. Vui lòng thử lại." }, 500);
}
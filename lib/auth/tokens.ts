import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

export const ACCESS_COOKIE = "alice_access";
export const REFRESH_COOKIE = "alice_refresh";

function readPositiveIntegerEnv(
  name: string,
  fallback: number,
): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} phải là số nguyên dương.`);
  }

  return value;
}

export const ACCESS_SECONDS = readPositiveIntegerEnv(
  "ACCESS_TOKEN_TTL_SECONDS",
  900,
);

// Dùng cùng đường dẫn khi tạo và xóa cookie.
const REFRESH_COOKIE_PATH = "/api/auth";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

function getSecret(): Uint8Array {
  const value = process.env.AUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET phải có ít nhất 32 ký tự.");
  }

  return new TextEncoder().encode(value);
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createRefreshToken(sessionId: string): string {
  if (!/^[a-f0-9]{24}$/.test(sessionId)) {
    throw new Error("Session ID không hợp lệ.");
  }

  return `${sessionId}.${randomBytes(32).toString("hex")}`;
}

export function getRefreshSessionId(
  value: string | undefined,
): string | null {
  if (!value || !/^[a-f0-9]{24}\.[a-f0-9]{64}$/.test(value)) {
    return null;
  }

  return value.split(".")[0];
}

export async function signAccessToken(
  userId: string,
  sessionId: string,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("alicetland")
    .setAudience("alicetland")
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ACCESS_SECONDS)
    .sign(getSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string; sessionId: string } | null> {
  const secret = getSecret();

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: "alicetland",
      audience: "alicetland",
    });

    if (
      typeof payload.sub !== "string" ||
      !/^[a-f0-9]{24}$/.test(payload.sub) ||
      typeof payload.sid !== "string" ||
      !/^[a-f0-9]{24}$/.test(payload.sid) ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      sessionId: payload.sid,
    };
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
}

export function setAuthCookies(
  response: NextResponse,
  tokens: SessionTokens,
): void {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieOptions(),
    path: "/",
    maxAge: ACCESS_SECONDS,
  });

  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: Math.max(
      0,
      Math.floor((tokens.expiresAt.getTime() - Date.now()) / 1000),
    ),
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", {
    ...cookieOptions(),
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE, "", {
    ...cookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: 0,
  });
}
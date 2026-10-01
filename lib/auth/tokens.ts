import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

export const ACCESS_COOKIE = "alice_access";
export const REFRESH_COOKIE = "alice_refresh";
export const ACCESS_SECONDS = 15 * 60;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

function getSecret() {
  const value = process.env.AUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET phải có ít nhất 32 ký tự.");
  }

  return new TextEncoder().encode(value);
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createRefreshToken(sessionId: string) {
  return `${sessionId}.${randomBytes(32).toString("hex")}`;
}

export function getRefreshSessionId(value: string | undefined) {
  if (!value || !/^[a-f0-9]{24}\.[a-f0-9]{64}$/.test(value)) {
    return null;
  }

  return value.split(".")[0];
}

export async function signAccessToken(
  userId: string,
  sessionId: string,
) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("alicetland")
    .setAudience("alicetland")
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string) {
  const secret = getSecret();

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: "alicetland",
      audience: "alicetland",
    });

    if (
      !/^[a-f0-9]{24}$/.test(payload.sub ?? "") ||
      typeof payload.sid !== "string" ||
      !/^[a-f0-9]{24}$/.test(payload.sid)
    ) {
      return null;
    }

    return { userId: payload.sub!, sessionId: payload.sid };
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
) {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieOptions(),
    path: "/",
    maxAge: ACCESS_SECONDS,
  });

  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieOptions(),
    path: "/api/auth",
    maxAge: Math.max(
      0,
      Math.floor((tokens.expiresAt.getTime() - Date.now()) / 1000),
    ),
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", {
    ...cookieOptions(),
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE, "", {
    ...cookieOptions(),
    path: "/api/auth",
    maxAge: 0,
  });
}
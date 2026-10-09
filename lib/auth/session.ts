import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { AuthError } from "@/lib/auth/http";
import { ACCESS_COOKIE } from "@/lib/auth/tokens";
import { currentUser } from "@/services/auth/auth.service";

export type SessionUser = Awaited<ReturnType<typeof currentUser>>;

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!accessToken) {
        return null;
    }

    try {
        return await currentUser(accessToken);
    } catch {
        return null;
    }
}

export async function getSessionUserFromRequest(
    request: NextRequest,
): Promise<SessionUser | null> {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

    if (!accessToken) {
        return null;
    }

    try {
        return await currentUser(accessToken);
    } catch {
        return null;
    }
}

export async function requireSessionUser(): Promise<SessionUser> {
    const user = await getCurrentSessionUser();

    if (!user) {
        throw new AuthError("Bạn chưa đăng nhập.", 401);
    }

    return user;
}

export async function requireAdminSessionUser(): Promise<SessionUser> {
    const user = await requireSessionUser();

    if (user.role !== "admin") {
        throw new AuthError("Bạn không có quyền truy cập quản trị.", 403);
    }

    return user;
}

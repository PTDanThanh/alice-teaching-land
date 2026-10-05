import type { NextRequest } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import { ACCESS_COOKIE } from "@/lib/auth/tokens";
import {
    AuthError,
    checkOrigin,
    errorResponse,
    json,
} from "@/lib/auth/http";
import { currentUser } from "@/services/auth/auth.service";
import User from "@/src/models/auth/user.model";

export const runtime = "nodejs";

function serializeUser(user: Record<string, unknown>) {
    const loginCount = typeof user.loginCount === "number" ? user.loginCount : 0;
    const totalTimeOnSiteSeconds =
        typeof user.totalTimeOnSiteSeconds === "number"
            ? user.totalTimeOnSiteSeconds
            : 0;
    const lastLoginAt =
        user.lastLoginAt instanceof Date
            ? user.lastLoginAt.toISOString()
            : typeof user.lastLoginAt === "string" && user.lastLoginAt
                ? user.lastLoginAt
                : null;

    return {
        id: String(user._id),
        fullName: typeof user.fullName === "string" ? user.fullName : "",
        email: typeof user.email === "string" ? user.email : "",
        role: user.role === "admin" ? "admin" : "client",
        isActive: Boolean(user.isActive),
        loginCount,
        lastLoginAt,
        totalTimeOnSiteSeconds,
        createdAt:
            user.createdAt instanceof Date
                ? user.createdAt.toISOString()
                : new Date().toISOString(),
        updatedAt:
            user.updatedAt instanceof Date
                ? user.updatedAt.toISOString()
                : new Date().toISOString(),
    };
}

async function ensureAdmin(request: NextRequest) {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    const user = await currentUser(accessToken);

    if (user.role !== "admin") {
        throw new AuthError("Bạn không có quyền truy cập quản trị.", 403);
    }

    return user;
}

export async function GET(request: NextRequest) {
    try {
        checkOrigin(request);
        await ensureAdmin(request);
        await connectToDatabase();

        const users = await User.find({})
            .sort({ createdAt: -1 })
            .lean<Record<string, unknown>[]>();

        return json({
            success: true,
            data: users.map((user) => serializeUser(user)),
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PATCH(request: NextRequest) {
    try {
        checkOrigin(request);
        await ensureAdmin(request);

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            throw new AuthError("Vui lòng gửi dữ liệu JSON.", 415);
        }

        const body = await request.json();
        const targetId = typeof body?.id === "string" ? body.id : "";
        const role = body?.role === "admin" || body?.role === "client" ? body.role : undefined;
        const isActive =
            typeof body?.isActive === "boolean" ? body.isActive : undefined;

        if (!targetId) {
            throw new AuthError("Thiếu thông tin người dùng.", 400);
        }

        if (role === undefined && isActive === undefined) {
            throw new AuthError("Không có dữ liệu cần cập nhật.", 400);
        }

        await connectToDatabase();

        const updates: Record<string, unknown> = {};
        if (role) updates.role = role;
        if (typeof isActive === "boolean") updates.isActive = isActive;

        const updated = await User.findByIdAndUpdate(targetId, updates, {
            new: true,
            runValidators: true,
        }).lean<Record<string, unknown>>();

        if (!updated) {
            throw new AuthError("Không tìm thấy người dùng cần cập nhật.", 404);
        }

        return json({
            success: true,
            message: "Cập nhật tài khoản thành công.",
            data: serializeUser(updated),
        });
    } catch (error) {
        return errorResponse(error);
    }
}

import { NextRequest, NextResponse } from "next/server";

import { getSessionUserFromRequest } from "@/lib/auth/session";
import { recordTimeOnSite } from "@/services/analytics/time-on-site.services";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

export async function POST(request: NextRequest) {
    try {
        const expectedOrigin = new URL(
            process.env.NEXT_PUBLIC_SITE_URL ??
            "http://localhost:3002",
        ).origin;

        if (request.headers.get("origin") !== expectedOrigin) {
            return json(
                { success: false, message: "Nguồn gửi không hợp lệ." },
                403,
            );
        }

        const user = await getSessionUserFromRequest(request);

        if (!user) {
            return json({ success: true, skipped: true }, 200);
        }

        const body: unknown = await request.json().catch(() => null);

        if (
            !body ||
            typeof body !== "object" ||
            !("tabId" in body) ||
            !("event" in body)
        ) {
            return json(
                { success: false, message: "Dữ liệu không hợp lệ." },
                400,
            );
        }

        const { tabId, event } = body;

        if (
            typeof tabId !== "string" ||
            !/^[a-f0-9-]{36}$/i.test(tabId) ||
            (event !== "heartbeat" && event !== "stop")
        ) {
            return json(
                { success: false, message: "Dữ liệu không hợp lệ." },
                400,
            );
        }

        await recordTimeOnSite(user.id, tabId, event);

        return json({ success: true });
    } catch (error) {
        console.error("Time on site error:", error);

        return json(
            {
                success: false,
                message: "Không thể ghi nhận thời gian truy cập.",
            },
            500,
        );
    }
}
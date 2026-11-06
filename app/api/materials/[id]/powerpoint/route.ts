import "server-only";

import { NextResponse } from "next/server";

import { getPublishedMaterialById } from "@/lib/material-detail";
import {
    getMaterialSignedUrl,
    isValidMaterialKey,
} from "@/lib/material-storage";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(
    _request: Request,
    { params }: RouteContext
) {
    try {
        const { id } = await params;

        // 1. Chỉ cho phép xem tài liệu đã xuất bản
        const material = await getPublishedMaterialById(id);

        if (!material || material.type !== "powerpoint") {
            return NextResponse.json(
                { error: "Không tìm thấy tài liệu PowerPoint." },
                { status: 404 }
            );
        }

        // 2. Kiểm tra bản PDF Preview đã được tạo hay chưa
        const previewKey = material.previewKey;

        if (
            !previewKey ||
            !isValidMaterialKey(previewKey) ||
            !/^materials\/preview\/[0-9a-f-]{36}\.pdf$/i.test(
                previewKey
            )
        ) {
            return NextResponse.json(
                { error: "Bản xem trước PowerPoint chưa sẵn sàng." },
                { status: 404 }
            );
        }

        // 3. Tạo URL có thời hạn để đọc PDF Preview từ R2
        const signedUrl = await getMaterialSignedUrl(previewKey);

        // 4. Chuyển hướng đến PDF Preview
        return NextResponse.redirect(signedUrl, {
            status: 307,
            headers: {
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        console.error("PowerPoint preview error:", error);

        return NextResponse.json(
            { error: "Không thể tải bản xem trước PowerPoint." },
            { status: 500 }
        );
    }
}
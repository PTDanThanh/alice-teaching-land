
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { getPublishedMaterialById } from "@/lib/material-detail";
import {
    getR2Client,
    getR2Bucket,
    isValidMaterialKey,
} from "@/lib/material-storage";

export const runtime = "nodejs";

interface RouteContext {
    params: Promise<{ id: string }>;
}

// =====================================================
// GET - TRẢ VỀ FILE DOCX GỐC ĐỂ XEM TRƯỚC
// =====================================================

export async function GET(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        const { id } = await params;

        // 1. Chỉ lấy tài liệu đã xuất bản
        const material = await getPublishedMaterialById(id);

        if (!material) {
            return NextResponse.json(
                { error: "Không tìm thấy tài liệu" },
                { status: 404 }
            );
        }

        // 2. Chỉ hỗ trợ tài liệu Word
        if (material.type !== "word") {
            return NextResponse.json(
                { error: "Định dạng không hỗ trợ" },
                { status: 400 }
            );
        }

        const key = material.downloadUrl;

        // 3. Kiểm tra object key DOCX hợp lệ
        if (
            !key ||
            !isValidMaterialKey(key) ||
            !key.toLowerCase().endsWith(".docx")
        ) {
            return NextResponse.json(
                { error: "File DOCX không hợp lệ" },
                { status: 400 }
            );
        }

        // 4. Đọc file DOCX gốc từ Cloudflare R2
        const response = await getR2Client().send(
            new GetObjectCommand({
                Bucket: getR2Bucket(),
                Key: key,
            })
        );

        if (!response.Body) {
            return NextResponse.json(
                { error: "Không đọc được file DOCX" },
                { status: 404 }
            );
        }

        // 5. Chuyển dữ liệu R2 thành byte array
        const bytes = await response.Body.transformToByteArray();

        // 6. Trả về file DOCX gốc, không chuyển sang HTML
        return new NextResponse(Buffer.from(bytes), {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

                "Content-Disposition": "inline",

                // Không cache tài liệu riêng tư
                "Cache-Control": "private, no-store",

                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("[DOCX Preview API]", error);

        return NextResponse.json(
            { error: "Không thể xem trước tài liệu DOCX" },
            { status: 500 }
        );
    }
}

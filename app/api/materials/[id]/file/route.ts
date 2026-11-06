//File này dùng để tạo API xem và tải file từ R2
import { NextRequest, NextResponse } from "next/server";

import { getPublishedMaterialById } from "@/lib/material-detail";
import {
  getMaterialSignedUrl,
  verifyMaterialObject,
} from "@/lib/material-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

const ORIGINAL_KEY_PATTERN =
  /^materials\/original\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx|ppt|pptx)$/i;

export async function GET(
  _request: NextRequest,
  { params }: Context
) {
  try {
    const { id } = await params;
    console.log("[Material File] Requested ID:", id);

    // Chỉ cấp quyền truy cập file của tài liệu đã xuất bản
    const material = await getPublishedMaterialById(id);

    console.log("[Material File] Material:", {
      found: Boolean(material),
      status: material?.status,
      hasFile: Boolean(material?.downloadUrl),
      objectKey: material?.downloadUrl,
    });

    if (!material?.downloadUrl) {
      return NextResponse.json(
        { error: "Không tìm thấy file tài liệu." },
        { status: 404 }
      );
    }

    // Không ký URL cho key không hợp lệ
    if (!ORIGINAL_KEY_PATTERN.test(material.downloadUrl)) {
      return NextResponse.json(
        { error: "Khóa file không hợp lệ." },
        { status: 400 }
      );
    }

    // Kiểm tra object có tồn tại thật trên R2
    const object = await verifyMaterialObject(material.downloadUrl);

    console.log("[Material File] R2 object:", {
      exists: object.exists,
      size: object.size,
      contentType: object.contentType,
    });

    if (!object.exists) {
      return NextResponse.json(
        { error: "File không tồn tại trên Cloudflare R2." },
        { status: 404 }
      );
    }

    // Signed URL có hiệu lực trong 5 phút
    const signedUrl = await getMaterialSignedUrl(
      material.downloadUrl,
      300
    );
    // Không log toàn bộ Signed URL vì URL chứa chữ ký truy cập R2.
    console.log("[Material File] Signed URL created:", {
      host: new URL(signedUrl).host,
      pathname: new URL(signedUrl).pathname,
    });

    // Chuyển hướng đến file trên R2
    return NextResponse.redirect(signedUrl, {
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("[Material File GET]", error);

    return NextResponse.json(
      { error: "Không thể mở file tài liệu." },
      { status: 500 }
    );
  }
}

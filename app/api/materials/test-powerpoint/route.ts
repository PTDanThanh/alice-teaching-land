
import { NextRequest, NextResponse } from "next/server";

import { canManageMaterials } from "@/lib/materials";
import { generatePowerPointPreview } from "@/lib/powerpoint-preview-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================================================
// POST - KIỂM THỬ CHUYỂN POWERPOINT THÀNH PDF
// =====================================================

// Chỉ cho phép sử dụng trong môi trường development.
export async function POST(request: NextRequest) {
  // 1. Không cho phép chạy trên production
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "API kiểm thử chỉ hoạt động trong development." },
      { status: 403 }
    );
  }

  // 2. Kiểm tra quyền quản trị
  if (!(await canManageMaterials())) {
    return NextResponse.json(
      { error: "Bạn không có quyền thực hiện." },
      { status: 403 }
    );
  }

  // 3. Kiểm tra Origin để hạn chế CSRF
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 }
    );
  }

  try {
    // 4. Lấy ID tài liệu cần kiểm thử
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("materialId" in body) ||
      typeof body.materialId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.materialId)
    ) {
      return NextResponse.json(
        { error: "materialId không hợp lệ." },
        { status: 400 }
      );
    }

    // 5. Tải PPTX từ R2, chuyển PDF và cập nhật MongoDB
    const previewKey = await generatePowerPointPreview(
      body.materialId
    );

    return NextResponse.json({
      success: true,
      message: "Đã tạo PDF Preview thành công.",
      previewKey,
    });
  } catch (error) {
    console.error("[Test PowerPoint]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo PDF Preview.",
      },
      { status: 500 }
    );
  }
}

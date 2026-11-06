
import { NextRequest, NextResponse } from "next/server";
import { connectMaterialsDB } from "@/lib/materials";
import MaterialModel from "@/src/models/Material";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API công khai: chỉ trả về tài liệu đã xuất bản
export async function GET(request: NextRequest) {
  try {
    // Kết nối MongoDB
    await connectMaterialsDB();

    // Kiểm tra có yêu cầu tài liệu trang chủ hay không
    const homeOnly =
      request.nextUrl.searchParams.get("home") === "1";

    // Điều kiện lọc
    const filter = {
      status: "published" as const,
      ...(homeOnly ? { showOnHome: true } : {}),
    };

    // Lấy dữ liệu từ MongoDB
    const rows = await MaterialModel.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    // Chuyển _id thành id để frontend sử dụng
    const materials = rows.map((row) => {
      const { _id, ...rest } = row;

      return {
        ...rest,
        id: row.id,
      };
    });

    return NextResponse.json(materials);
  } catch (error) {
    console.error("[Materials API] GET error:", error);

    return NextResponse.json(
      { error: "Không tải được tài liệu" },
      { status: 500 }
    );
  }
}

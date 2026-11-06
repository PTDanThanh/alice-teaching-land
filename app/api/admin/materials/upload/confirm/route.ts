
import { NextRequest, NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/session";
import {
  canManageMaterials,
  connectMaterialsDB,
} from "@/lib/materials";
import { verifyMaterialObject } from "@/lib/material-storage";
import MaterialUploadModel from "@/src/models/materialUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================================================
// 1. KIỂM TRA DỮ LIỆU ĐẦU VÀO
// =====================================================

type ConfirmUploadRequest = {
  uploadId?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =====================================================
// 2. API XÁC NHẬN UPLOAD
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Chỉ Admin được xác nhận upload
    if (!(await canManageMaterials())) {
      return NextResponse.json(
        { error: "Bạn không có quyền xác nhận upload." },
        { status: 403 }
      );
    }

    // Kiểm tra Origin để hạn chế CSRF
    const origin = request.headers.get("origin");

    if (origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { error: "Nguồn yêu cầu không hợp lệ." },
        { status: 403 }
      );
    }

    // Lấy thông tin Admin từ session
    const user = await getCurrentSessionUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    // Phải dùng cùng một định danh Admin ở API upload
    const ownerId = String(user.id);

    if (!ownerId || ownerId === "undefined") {
      return NextResponse.json(
        { error: "Không xác định được Admin." },
        { status: 401 }
      );
    }

    // Đọc mã phiên upload
    const body: ConfirmUploadRequest = await request.json();

    if (
      typeof body.uploadId !== "string" ||
      !UUID_PATTERN.test(body.uploadId)
    ) {
      return NextResponse.json(
        { error: "Mã phiên upload không hợp lệ." },
        { status: 400 }
      );
    }

    await connectMaterialsDB();

    // Chỉ tìm phiên upload thuộc Admin hiện tại
    const upload = await MaterialUploadModel.findOne({
      uploadId: body.uploadId,
      ownerId,
    });

    if (!upload) {
      return NextResponse.json(
        { error: "Không tìm thấy phiên upload." },
        { status: 404 }
      );
    }

    // File đã được gắn vào tài liệu
    if (upload.status === "attached") {
      return NextResponse.json(
        { error: "File đã được sử dụng bởi tài liệu." },
        { status: 409 }
      );
    }

    // Không cho xác nhận phiên upload đã hết hạn
    if (upload.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Phiên upload đã hết hạn." },
        { status: 410 }
      );
    }

    // =================================================
    // 3. KIỂM TRA FILE TRÊN CLOUDFLARE R2
    // =================================================

    const result = await verifyMaterialObject(
      upload.objectKey,
      upload.fileSize
    );

    if (!result.exists) {
      return NextResponse.json(
        {
          error:
            "File chưa được upload hoặc dung lượng không hợp lệ.",
        },
        { status: 400 }
      );
    }

    // Kiểm tra MIME đã lưu trên R2
    if (result.contentType !== upload.contentType) {
      return NextResponse.json(
        { error: "Định dạng MIME không khớp." },
        { status: 400 }
      );
    }

    // =================================================
    // 4. CẬP NHẬT TRẠNG THÁI
    // =================================================

    // Chỉ chuyển pending -> confirmed
    // Tránh ghi đè trạng thái nếu có request đồng thời
    const confirmed = await MaterialUploadModel.findOneAndUpdate(
      {
        _id: upload._id,
        ownerId,
        status: "pending",
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: "confirmed",
        },
      },
      {
        new: true,
      }
    );

    // Nếu request xác nhận bị lặp lại, trả về kết quả hiện tại
    if (!confirmed) {
      const current = await MaterialUploadModel.findById(upload._id);

      if (current?.status === "confirmed") {
        return NextResponse.json({
          success: true,
          message: "File đã được xác nhận trước đó.",
          data: {
            uploadId: current.uploadId,
            key: current.objectKey,
            status: current.status,
          },
        });
      }

      return NextResponse.json(
        { error: "Trạng thái phiên upload đã thay đổi." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Xác nhận upload thành công.",
      data: {
        uploadId: confirmed.uploadId,
        key: confirmed.objectKey,
        status: confirmed.status,
        size: result.size,
        contentType: result.contentType,
      },
    });
  } catch (error) {
    console.error("[Materials Upload Confirm]", error);

    return NextResponse.json(
      { error: "Không thể xác nhận upload tài liệu." },
      { status: 500 }
    );
  }
}

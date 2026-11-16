import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/session";
import { canManageMaterials, connectMaterialsDB } from "@/lib/materials";
import { getMaterialUploadState } from "@/lib/material-upload-status";
import MaterialUploadModel from "@/src/models/materialUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UploadStatusRouteContext = {
  params: Promise<{ uploadId: string }>;
};

export async function GET(
  _request: Request,
  { params }: UploadStatusRouteContext
) {
  try {
    if (!(await canManageMaterials())) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem trạng thái upload." },
        { status: 403 }
      );
    }

    const user = await getCurrentSessionUser();

    if (!user || user.role !== "admin" || !user.id) {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    const { uploadId } = await params;

    if (!UUID_PATTERN.test(uploadId)) {
      return NextResponse.json(
        { error: "Mã phiên upload không hợp lệ." },
        { status: 400 }
      );
    }

    await connectMaterialsDB();

    const upload = await MaterialUploadModel.findOne({
      uploadId,
      ownerId: String(user.id),
    })
      .select(
        "objectKey status scanStatus promotionStatus cleanupStatus expiresAt"
      )
      .lean();

    if (!upload) {
      return NextResponse.json(
        { error: "Không tìm thấy phiên upload." },
        { status: 404 }
      );
    }

    const state = getMaterialUploadState(upload);

    return NextResponse.json(
      { success: true, data: state },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[Material Upload Status]", error);

    return NextResponse.json(
      { error: "Không thể tải trạng thái upload." },
      { status: 500 }
    );
  }
}

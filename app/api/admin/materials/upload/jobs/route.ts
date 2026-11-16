
import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/session";
import { canManageMaterials, connectMaterialsDB } from "@/lib/materials";
import { getMaterialUploadState } from "@/lib/material-upload-status";
import MaterialUploadModel from "@/src/models/materialUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chỉ trả về 20 phiên upload gần nhất của Admin.
const MAX_JOBS = 20;

export async function GET() {
  try {
    // 1. Kiểm tra quyền quản lý tài liệu.
    if (!(await canManageMaterials())) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem tiến độ xử lý file." },
        { status: 403 }
      );
    }

    // 2. Xác định Admin đang đăng nhập.
    const user = await getCurrentSessionUser();

    if (!user || user.role !== "admin" || !user.id) {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    const ownerId = String(user.id);

    await connectMaterialsDB();

    // 3. Chỉ đọc các phiên upload của Admin hiện tại.
    const uploads = await MaterialUploadModel.find({ ownerId })
      .sort({ _id: -1 })
      .limit(MAX_JOBS)
      .select(
        "uploadId originalName objectKey fileSize status scanStatus " +
        "promotionStatus cleanupStatus expiresAt scannedAt " +
        "promotedAt cleanedAt"
      )
      .lean();

    const now = Date.now();

    // 4. Chuẩn hóa trạng thái cho frontend.
    const jobs = uploads.map((upload) => {
      const state = getMaterialUploadState(upload, now);

      return {
        uploadId: upload.uploadId,
        filename: upload.originalName,
        fileSize: upload.fileSize,
        status: upload.status,
        scanStatus: upload.scanStatus,
        promotionStatus: upload.promotionStatus,
        cleanupStatus: upload.cleanupStatus,
        expired: state.expired,
        ready: state.ready,
        scannedAt: upload.scannedAt ?? null,
        promotedAt: upload.promotedAt ?? null,
        cleanedAt: upload.cleanedAt ?? null,
      };
    });

    return NextResponse.json(
      { success: true, data: { jobs } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[Materials Upload Jobs]", error);

    return NextResponse.json(
      { error: "Không thể tải tiến độ xử lý file." },
      { status: 500 }
    );
  }
}

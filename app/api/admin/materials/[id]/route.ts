
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import {
  canManageMaterials,
  connectMaterialsDB,
  parseMaterial,
} from "@/lib/materials";

import { getCurrentSessionUser } from "@/lib/auth/session";

import {
  attachMaterialUpload,
  detachMaterialUpload,
  isMaterialObjectKey,
} from "@/lib/material-upload-attachment";

import MaterialModel from "@/src/models/Material";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

// =====================================================
// PUT - CẬP NHẬT TÀI LIỆU
// =====================================================

export async function PUT(
  request: Request,
  { params }: Context
) {
  if (!(await canManageMaterials())) {
    return NextResponse.json(
      { error: "Forbidden" },
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

  const ownerId = String(user.id);

  try {
    const parsed = parseMaterial(await request.json());

    if (!parsed) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    if (
      parsed.downloadUrl !== null &&
      !isMaterialObjectKey(parsed.downloadUrl)
    ) {
      return NextResponse.json(
        { error: "File tài liệu không hợp lệ." },
        { status: 400 }
      );
    }

    await connectMaterialsDB();

    const { id } = await params;
    const session = await mongoose.startSession();

    let result: Record<string, unknown> | null = null;

    try {
      await session.withTransaction(async () => {
        const existing = await MaterialModel.findOne({ id })
          .session(session);

        if (!existing) {
          throw new Error("MATERIAL_NOT_FOUND");
        }

        const oldKey = existing.downloadUrl ?? null;
        const newKey = parsed.downloadUrl;

        // Chỉ xử lý upload khi Admin thay file
        if (newKey !== oldKey) {
          if (newKey) {
            await attachMaterialUpload(
              newKey,
              ownerId,
              id,
              session
            );
          }

          // Đánh dấu file cũ không còn được sử dụng
          await detachMaterialUpload(oldKey, id, session);
        }

        // Khi thay file gốc, không tiếp tục sử dụng PDF Preview cũ.
        // Nếu không thay file, giữ nguyên previewKey hiện tại.
        const fileChanged = newKey !== oldKey;

        const updated = await MaterialModel.findOneAndUpdate(
          { id },
          {
            $set: {
              ...parsed,

              // Chỉ reset previewKey khi file gốc thay đổi.
              // previewKey sẽ được worker cập nhật sau khi chuyển đổi thành công.
              ...(fileChanged ? { previewKey: null } : {}),

              updatedAt: new Date().toISOString(),
            },
          },
          {
            returnDocument: "after",
            session,
          }
        ).lean();

        if (!updated) {
          throw new Error("MATERIAL_NOT_FOUND");
        }

        const { _id, ...row } = updated;
        result = row;
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Admin Materials PUT]", error);

    if (
      error instanceof Error &&
      error.message === "MATERIAL_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "Không tìm thấy tài liệu." },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "UPLOAD_NOT_CONFIRMED"
    ) {
      return NextResponse.json(
        {
          error:
            "File mới chưa được xác nhận hoặc đã được sử dụng.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Không thể cập nhật tài liệu." },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - XÓA TÀI LIỆU
// =====================================================

export async function DELETE(
  _request: Request,
  { params }: Context
) {
  if (!(await canManageMaterials())) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    await connectMaterialsDB();

    const { id } = await params;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const existing = await MaterialModel.findOne({ id })
          .session(session);

        if (!existing) {
          throw new Error("MATERIAL_NOT_FOUND");
        }

        // Đánh dấu file để có thể dọn khỏi R2 sau này
        await detachMaterialUpload(
          existing.downloadUrl ?? null,
          id,
          session
        );

        await MaterialModel.deleteOne({ id }).session(session);
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Admin Materials DELETE]", error);

    if (
      error instanceof Error &&
      error.message === "MATERIAL_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "Không tìm thấy tài liệu." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Không thể xóa tài liệu." },
      { status: 500 }
    );
  }
}

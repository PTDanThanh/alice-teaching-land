
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

import {
  canManageMaterials,
  connectMaterialsDB,
  parseMaterial,
} from "@/lib/materials";

import { getCurrentSessionUser } from "@/lib/auth/session";
import {
  attachMaterialUpload,
  isMaterialObjectKey,
} from "@/lib/material-upload-attachment";

import MaterialModel from "@/src/models/Material";

export const runtime = "nodejs";

// =====================================================
// GET - LẤY DANH SÁCH TÀI LIỆU
// =====================================================

export async function GET() {
  if (!(await canManageMaterials())) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    await connectMaterialsDB();

    const rows = await MaterialModel.find()
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(
      rows.map(({ _id, ...row }) => row)
    );
  } catch (error) {
    console.error("[Admin Materials GET]", error);

    return NextResponse.json(
      { error: "Không tải được tài liệu" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - THÊM TÀI LIỆU
// =====================================================

export async function POST(request: Request) {
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
    // DEBUG: Kiểm tra dữ liệu Admin gửi trước khi parse
    const body = await request.json();

    console.log("[Materials POST - Request]", {
      type: body?.type,
      downloadUrl: body?.downloadUrl,
    });

    // Kiểm tra dữ liệu sau khi parse
    const parsed = parseMaterial(body);

    console.log("[Materials POST - Parsed]", {
      type: parsed?.type,
      downloadUrl: parsed?.downloadUrl,
    });
    console.log("[Admin Materials POST]", {
      type: parsed?.type,
      downloadUrl: parsed?.downloadUrl,
    });


    if (!parsed) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    // Chỉ chấp nhận R2 object key hoặc null
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

    const row = {
      ...parsed,
      id: randomUUID(),
      updatedAt: new Date().toISOString(),
    };

    // Dùng transaction để cập nhật hai collection đồng bộ
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Gắn file đã xác nhận vào tài liệu
        if (parsed.downloadUrl) {
          await attachMaterialUpload(
            parsed.downloadUrl,
            ownerId,
            row.id,
            session
          );
        }

        // Tạo tài liệu trong MongoDB
        await MaterialModel.create([row], { session });
      });
    } finally {
      await session.endSession();
    }
    // DEBUG: Kiểm tra tài liệu thực tế đã lưu vào MongoDB
    const savedMaterial = await MaterialModel.findOne({
      id: row.id,
    })
      .select("id type status downloadUrl")
      .lean();

    console.log("[Materials POST - SAVED]", savedMaterial);

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("[Admin Materials POST]", error);

    if (
      error instanceof Error &&
      error.message === "UPLOAD_NOT_CONFIRMED"
    ) {
      return NextResponse.json(
        {
          error:
            "File chưa được xác nhận hoặc đã được sử dụng.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Không thể thêm tài liệu" },
      { status: 500 }
    );
  }
}

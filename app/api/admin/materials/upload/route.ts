
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getCurrentSessionUser } from "@/lib/auth/session";
import { canManageMaterials, connectMaterialsDB } from "@/lib/materials";
import { getR2Client, getR2Bucket } from "@/lib/material-storage";
import MaterialUploadModel from "@/src/models/materialUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================================================
// 1. CẤU HÌNH UPLOAD
// =====================================================

const MAX_FILE_SIZE = 20 * 1024 * 1024;

// URL upload có hiệu lực trong 5 phút
const UPLOAD_URL_EXPIRES_IN = 300;

// Phiên upload tạm có hiệu lực trong 15 phút
const UPLOAD_SESSION_EXPIRES_IN = 15 * 60 * 1000;

const ALLOWED_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

type UploadRequest = {
  filename?: unknown;
  contentType?: unknown;
  size?: unknown;
};

// =====================================================
// 2. TẠO PHIÊN UPLOAD VÀ PRESIGNED URL
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra quyền Admin
    if (!(await canManageMaterials())) {
      return NextResponse.json(
        { error: "Bạn không có quyền upload tài liệu." },
        { status: 403 }
      );
    }

    // Kiểm tra Origin để hạn chế CSRF
    const origin = request.headers.get("origin");
    const expectedOrigin = request.nextUrl.origin;

    if (origin !== expectedOrigin) {
      return NextResponse.json(
        { error: "Nguồn yêu cầu không hợp lệ." },
        { status: 403 }
      );
    }

    // Lấy ID Admin từ phiên đăng nhập
    const user = await getCurrentSessionUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ." },
        { status: 401 }
      );
    }

    // Chuyển ID thành string để lưu MongoDB
    // Nếu session của dự án sử dụng _id thay cho id,
    // cần điều chỉnh theo kiểu trả về thực tế.
    const ownerId = String(user.id);

    if (!ownerId || ownerId === "undefined") {
      return NextResponse.json(
        { error: "Không xác định được Admin." },
        { status: 401 }
      );
    }

    // Đọc dữ liệu từ frontend
    const body: UploadRequest = await request.json();

    const { filename, contentType, size } = body;

    if (
      typeof filename !== "string" ||
      !filename.trim() ||
      filename.length > 255
    ) {
      return NextResponse.json(
        { error: "Tên file không hợp lệ." },
        { status: 400 }
      );
    }

    if (
      typeof size !== "number" ||
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: "Dung lượng file tối đa là 20 MB." },
        { status: 400 }
      );
    }

    const extension = path.extname(filename).toLowerCase();
    const expectedContentType = ALLOWED_TYPES[extension];

    if (!expectedContentType) {
      return NextResponse.json(
        {
          error:
            "Chỉ hỗ trợ DOC, DOCX, PDF, PPT và PPTX.",
        },
        { status: 400 }
      );
    }

    // Kiểm tra MIME do trình duyệt cung cấp
    if (
      contentType !== expectedContentType &&
      contentType !== "application/octet-stream" &&
      contentType !== ""
    ) {
      return NextResponse.json(
        { error: "Định dạng MIME không hợp lệ." },
        { status: 400 }
      );
    }

    // =================================================
    // 3. TẠO THÔNG TIN UPLOAD
    // =================================================

    const uploadId = randomUUID();

    const objectKey =
      `materials/original/${randomUUID()}${extension}`;

    const expiresAt = new Date(
      Date.now() + UPLOAD_SESSION_EXPIRES_IN
    );

    // Lưu phiên upload trước khi cấp URL
    await connectMaterialsDB();

    await MaterialUploadModel.create({
      uploadId,
      objectKey,
      ownerId,
      originalName: filename.trim(),
      contentType: expectedContentType,
      fileSize: size,
      status: "pending",
      materialId: null,
      expiresAt,
    });

    // =================================================
    // 4. TẠO PRESIGNED URL CLOUDFLARE R2
    // =================================================

    try {
      const command = new PutObjectCommand({
        Bucket: getR2Bucket(),
        Key: objectKey,
        ContentType: expectedContentType,
      });

      const uploadUrl = await getSignedUrl(
        getR2Client(),
        command,
        {
          expiresIn: UPLOAD_URL_EXPIRES_IN,
        }
      );

      return NextResponse.json(
        {
          success: true,
          message: "Đã tạo phiên upload tài liệu.",
          data: {
            uploadId,
            uploadUrl,
            key: objectKey,
            contentType: expectedContentType,
            expiresIn: UPLOAD_URL_EXPIRES_IN,
          },
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    } catch (error) {
      // Nếu tạo URL thất bại, xóa phiên pending
      await MaterialUploadModel.deleteOne({
        uploadId,
        status: "pending",
      });

      throw error;
    }
  } catch (error) {
    console.error("[Materials Upload] POST error:", error);

    return NextResponse.json(
      { error: "Không thể tạo phiên upload tài liệu." },
      { status: 500 }
    );
  }
}

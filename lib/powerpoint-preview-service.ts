// Tải PowerPoint gốc từ R2 bằng GetObjectCommand.
// Chuyển PowerPoint sang PDF bằng convertPowerPointToPdf().
// Upload PDF Preview lên R2 bằng uploadMaterialObject().
// Cập nhật previewKey trong MongoDB, chỉ khi tài liệu vẫn tham chiếu đến file PowerPoint gốc.


import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";

import { GetObjectCommand } from "@aws-sdk/client-s3";

import { connectMaterialsDB } from "@/lib/materials";
import { convertPowerPointToPdf } from "@/lib/powerpoint-converter";

import {
  getR2Client,
  getR2Bucket,
  uploadMaterialObject,
  deleteMaterialObject,
  isValidMaterialKey,
  MAX_MATERIAL_FILE_SIZE,
} from "@/lib/material-storage";

import MaterialModel from "@/src/models/Material";

// =====================================================
// 1. CẤU HÌNH
// =====================================================

// Kiểm tra file PowerPoint gốc thuộc thư mục original
const ORIGINAL_POWERPOINT_PATTERN =
  /^materials\/original\/[0-9a-f-]{36}\.(ppt|pptx)$/i;

// =====================================================
// 2. TẠO PDF PREVIEW CHO POWERPOINT
// =====================================================

// Hàm này chỉ dành cho backend/worker đáng tin cậy.
// Không gọi trực tiếp từ frontend.
export async function generatePowerPointPreview(
  materialId: string
): Promise<string> {
  await connectMaterialsDB();

  // 1. Tìm tài liệu trong MongoDB
  const material = await MaterialModel.findOne({
    id: materialId,
  }).lean();

  if (!material) {
    throw new Error("MATERIAL_NOT_FOUND");
  }

  // 2. Chỉ xử lý tài liệu PowerPoint
  if (material.type !== "powerpoint") {
    throw new Error("NOT_POWERPOINT");
  }

  const originalKey = material.downloadUrl;

  // 3. Kiểm tra object key của file gốc
  if (
    !originalKey ||
    !isValidMaterialKey(originalKey) ||
    !ORIGINAL_POWERPOINT_PATTERN.test(originalKey)
  ) {
    throw new Error("INVALID_POWERPOINT_KEY");
  }

  // 4. Xác định định dạng file
  const extension = path.extname(originalKey).toLowerCase();

  if (extension !== ".ppt" && extension !== ".pptx") {
    throw new Error("UNSUPPORTED_POWERPOINT_FORMAT");
  }

  // =================================================
  // 3. TẢI POWERPOINT GỐC TỪ CLOUDFLARE R2
  // =================================================

  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2Bucket(),
      Key: originalKey,
    })
  );

  if (!response.Body) {
    throw new Error("POWERPOINT_FILE_EMPTY");
  }

  // Kiểm tra kích thước trước khi đọc file
  if (
    response.ContentLength !== undefined &&
    response.ContentLength > MAX_MATERIAL_FILE_SIZE
  ) {
    throw new Error("POWERPOINT_FILE_TOO_LARGE");
  }

  const bytes = await response.Body.transformToByteArray();
  const powerpointBuffer = Buffer.from(bytes);

  if (
    powerpointBuffer.length === 0 ||
    powerpointBuffer.length > MAX_MATERIAL_FILE_SIZE
  ) {
    throw new Error("POWERPOINT_FILE_TOO_LARGE");
  }

  // =================================================
  // 4. CHUYỂN POWERPOINT SANG PDF
  // =================================================

  const pdfBuffer = await convertPowerPointToPdf(
    powerpointBuffer,
    extension
  );

  // =================================================
  // 5. UPLOAD PDF PREVIEW LÊN R2
  // =================================================

  // Tạo key mới, không ghi đè preview cũ
  const previewKey =
    `materials/preview/${randomUUID()}.pdf`;

  await uploadMaterialObject(
    previewKey,
    pdfBuffer,
    "application/pdf"
  );

  // =================================================
  // 6. CẬP NHẬT MONGODB
  // =================================================

  try {
    // Chỉ cập nhật khi tài liệu vẫn sử dụng file gốc
    // và chưa có preview khác được gắn vào.
    const updated = await MaterialModel.updateOne(
      {
        id: materialId,
        type: "powerpoint",
        downloadUrl: originalKey,
        previewKey: null,
      },
      {
        $set: {
          previewKey,
        },
      }
    );

    if (updated.matchedCount !== 1) {
      // Không ghi đè preview của job khác
      throw new Error("PREVIEW_UPDATE_CONFLICT");
    }

    return previewKey;
  } catch (error) {
    // Nếu cập nhật MongoDB thất bại,
    // xóa bản PDF vừa upload để tránh file mồ côi.
    try {
      await deleteMaterialObject(previewKey);
    } catch (cleanupError) {
      console.error(
        "[PowerPoint Preview] Cleanup error:",
        cleanupError
      );
    }

    throw error;
  }
}

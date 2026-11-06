// Helper này được dùng chung cho POST và PUT, tránh lặp logic.


import "server-only";

import type { ClientSession } from "mongoose";

import MaterialUploadModel from "@/src/models/materialUpload";
import MaterialModel from "@/src/models/Material";

const KEY_PATTERN =
  /^materials\/original\/[0-9a-f-]{36}\.(pdf|doc|docx|ppt|pptx)$/i;

// Kiểm tra key có đúng định dạng hệ thống tạo không
export function isMaterialObjectKey(
  value: string | null
): value is string {
  return typeof value === "string" && KEY_PATTERN.test(value);
}

// Kiểm tra file đã xác nhận, đúng Admin và chưa gắn vào tài liệu
export async function attachMaterialUpload(
  key: string,
  ownerId: string,
  materialId: string,
  session: ClientSession
) {
  const upload = await MaterialUploadModel.findOneAndUpdate(
    {
      objectKey: key,
      ownerId,
      status: "confirmed",
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        status: "attached",
        materialId,
      },
    },
    {
      new: true,
      session,
    }
  );

  if (!upload) {
    throw new Error("UPLOAD_NOT_CONFIRMED");
  }

  return upload;
}

// Khi thay file, chuyển file cũ về confirmed để chờ dọn dẹp
export async function detachMaterialUpload(
  key: string | null,
  materialId: string,
  session: ClientSession
) {
  if (!isMaterialObjectKey(key)) return;

  await MaterialUploadModel.updateOne(
    {
      objectKey: key,
      materialId,
      status: "attached",
    },
    {
      $set: {
        status: "confirmed",
        materialId: null,
      },
    },
    { session }
  );
}

// Kiểm tra file có đang được tài liệu khác tham chiếu không
export async function isMaterialFileInUse(
  key: string
): Promise<boolean> {
  const count = await MaterialModel.countDocuments({
    downloadUrl: key,
  });

  return count > 0;
}

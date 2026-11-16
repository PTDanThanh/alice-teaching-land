/**
 * BƯỚC 11E.5C - MATERIAL UPLOAD ATTACHMENT
 * Chỉ attach file verified đã scan sạch, promotion hoàn tất,
 * và chưa được cleanup claim. Không xóa R2.
 */
import "server-only";
import type { ClientSession } from "mongoose";
import MaterialUploadModel from "@/src/models/materialUpload";
import MaterialModel from "@/src/models/Material";

// Giữ nhận diện original cũ cho detach, nhưng không attach mới.
const KEY_PATTERN = /^materials\/(?:original|verified)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:pdf|doc|docx|ppt|pptx)$/i;
const VERIFIED_KEY_PATTERN = /^materials\/verified\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:pdf|doc|docx|ppt|pptx)$/i;

export function isMaterialObjectKey(value: string | null): value is string {
    return typeof value === "string" && KEY_PATTERN.test(value);
}

export async function attachMaterialUpload(
    key: string,
    ownerId: string,
    materialId: string,
    session: ClientSession
) {
    if (!VERIFIED_KEY_PATTERN.test(key)) {
        throw new Error("UPLOAD_NOT_CONFIRMED");
    }

    // 11E.5C: Atomic update cùng cleanupStatus.
    // Nếu cleanup claim trước, attach không thể thành công.
    // Nếu attach trước, cleanup claim sẽ không còn match status=confirmed.
    const upload = await MaterialUploadModel.findOneAndUpdate(
        {
            objectKey: key,
            ownerId,
            status: "confirmed",
            materialId: null,
            scanStatus: "clean",
            promotionStatus: "completed",
            cleanupStatus: "pending",
            expiresAt: { $gt: new Date() },
        },
        { $set: { status: "attached", materialId } },
        { returnDocument: "after", session }
    );

    if (!upload) throw new Error("UPLOAD_NOT_CONFIRMED");
    return upload;
}

export async function detachMaterialUpload(
    key: string | null,
    materialId: string,
    session: ClientSession
) {
    if (!isMaterialObjectKey(key)) return;

    // 11E.5C: Không detach bản ghi đang cleanup.
    // Không xóa R2 ở đây.
    await MaterialUploadModel.updateOne(
        {
            objectKey: key,
            materialId,
            status: "attached",
            cleanupStatus: "pending",
        },
        { $set: { status: "confirmed", materialId: null } },
        { session }
    );
}

export async function isMaterialFileInUse(key: string): Promise<boolean> {
    // Bảo vệ cả previewKey nếu trùng key.
    const count = await MaterialModel.countDocuments({
        $or: [{ downloadUrl: key }, { previewKey: key }],
    });
    return count > 0;
}


import "server-only";

import { connectMaterialsDB } from "@/lib/materials";
import MaterialModel from "@/src/models/Material";
import type { Material } from "@/data/materials";

// Chỉ lấy tài liệu đã xuất bản
export async function getPublishedMaterialById(
    id: string
): Promise<Material | null> {
    await connectMaterialsDB();

    const row = await MaterialModel.findOne({
        id,
        status: "published",
    })
        .select("-_id -__v")
        .lean();

    if (!row) return null;

    return {
        id: row.id,
        title: row.title,
        description: row.description,
        language: row.language,
        type: row.type,
        level: row.level,
        collection: row.collection,
        updatedAt: row.updatedAt,
        // Object key của PDF Preview được chuyển đổi từ PowerPoint
        previewKey: row.previewKey ?? null,
        downloadUrl: row.downloadUrl ?? null,
        status: row.status,
        showOnHome: row.showOnHome,
    };
}

// Lấy tối đa 3 tài liệu liên quan
export async function getRelatedMaterials(
    material: Material
): Promise<Material[]> {
    await connectMaterialsDB();

    const rows = await MaterialModel.find({
        id: { $ne: material.id },
        status: "published",
        language: material.language,
    })
        .sort({ updatedAt: -1 })
        .limit(3)
        .select("-_id -__v")
        .lean();

    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        language: row.language,
        type: row.type,
        level: row.level,
        collection: row.collection,
        updatedAt: row.updatedAt,
        downloadUrl: row.downloadUrl ?? null,
        status: row.status,
        showOnHome: row.showOnHome,
        // Trả về object key của PDF Preview
        previewKey: row.previewKey ?? null,
    }));
}

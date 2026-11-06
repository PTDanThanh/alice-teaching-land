import mongoose, { Schema, type Model } from "mongoose";
import type { Material } from "@/data/materials";

const materialSchema = new Schema<Material>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  language: { type: String, enum: ["en", "fr"], required: true },
  type: { type: String, enum: ["word", "pdf", "powerpoint"], required: true },
  level: { type: String, enum: ["A1", "A2", "B1", "B2", "C1", "C2"], required: true },
  collection: { type: String, default: "" },
  updatedAt: { type: String, required: true },
  downloadUrl: { type: String, default: null },
  status: { type: String, enum: ["published", "draft"], default: "draft" },
  showOnHome: { type: Boolean, default: false },
  // Object key của bản PDF Preview được chuyển đổi từ PowerPoint
  previewKey: {
    type: String,
    default: null,
  },
}, { versionKey: false });
materialSchema.index({ status: 1, showOnHome: 1, updatedAt: -1 });
const MaterialModel = (mongoose.models.Material as Model<Material> | undefined) ?? mongoose.model<Material>("Material", materialSchema);
export default MaterialModel;


import mongoose, {
  Schema,
  type Model,
  type InferSchemaType,
} from "mongoose";

// =====================================================
// 1. TRẠNG THÁI UPLOAD
// =====================================================

// pending: Đã cấp URL upload, chờ tải file lên R2
// confirmed: File đã được xác nhận trên R2
// attached: File đã được gắn vào một tài liệu
export type MaterialUploadStatus =
  | "pending"
  | "confirmed"
  | "attached";

// =====================================================
// 2. SCHEMA MATERIAL UPLOAD
// =====================================================

const materialUploadSchema = new Schema(
  {
    // Mã phiên upload duy nhất
    uploadId: {
      type: String,
      required: true,
      unique: true,
    },

    // Khóa file lưu trên Cloudflare R2
    objectKey: {
      type: String,
      required: true,
      unique: true,
    },

    // ID của Admin tạo phiên upload
    ownerId: {
      type: String,
      required: true,
      index: true,
    },

    // Tên file gốc
    originalName: {
      type: String,
      required: true,
    },

    // Định dạng MIME
    contentType: {
      type: String,
      required: true,
    },

    // Dung lượng file tính bằng byte
    fileSize: {
      type: Number,
      required: true,
      min: 1,
      max: 20 * 1024 * 1024,
    },

    // Trạng thái của phiên upload
    status: {
      type: String,
      enum: ["pending", "confirmed", "attached"],
      default: "pending",
      required: true,
    },

    // ID tài liệu sau khi gắn file
    materialId: {
      type: String,
      default: null,
    },

    // Thời gian hết hạn phiên upload
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// =====================================================
// 3. INDEX
// =====================================================

// Tìm các phiên upload theo Admin và trạng thái
materialUploadSchema.index({
  ownerId: 1,
  status: 1,
});

// Không tạo TTL index tự động ở đây.
// Nếu xóa bản ghi trước khi dọn object R2,
// file có thể bị bỏ lại trên storage.

// =====================================================
// 4. EXPORT MODEL
// =====================================================

export type MaterialUploadDocument =
  InferSchemaType<typeof materialUploadSchema>;

const MaterialUploadModel =
  (mongoose.models.MaterialUpload as
    | Model<MaterialUploadDocument>
    | undefined) ??
  mongoose.model<MaterialUploadDocument>(
    "MaterialUpload",
    materialUploadSchema
  );

export default MaterialUploadModel;

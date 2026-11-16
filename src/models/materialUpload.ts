
import mongoose, {
  Schema,
  type Model,
  type InferSchemaType,
} from "mongoose";

// =====================================================
// 1. TRẠNG THÁI UPLOAD
// =====================================================

// pending: Đã cấp URL upload, chờ tải file lên R2.
// confirmed: File đã được xác nhận trên R2.
// attached: File đã được gắn vào một tài liệu.
export type MaterialUploadStatus =
  | "pending"
  | "confirmed"
  | "attached";

// =====================================================
// 2. TRẠNG THÁI KIỂM TRA BẢO MẬT FILE
// =====================================================

// pending: Chưa thực hiện quét.
// scanning: Đang kiểm tra file.
// clean: Đã vượt qua kiểm tra bảo mật.
// infected: Phát hiện mã độc.
// failed: Không thể hoàn tất quá trình quét.
export type MaterialScanStatus =
  | "pending"
  | "scanning"
  | "clean"
  | "infected"
  | "failed";


// =====================================================
// BƯỚC 11C - TRẠNG THÁI CHUYỂN FILE SANG VERIFIED
// =====================================================

export type MaterialPromotionStatus =
  | "pending"
  | "promoting"
  | "completed"
  | "failed";

// =====================================================
// BƯỚC 11E.3 - TRẠNG THÁI CLEANUP
// =====================================================

// pending: Chưa được chọn để cleanup.
// cleaning: Worker đã claim quyền xử lý.
// completed: Cleanup đã hoàn tất.
// failed: Cleanup thất bại sau số lần cho phép.
export type MaterialCleanupStatus =
  | "pending"
  | "cleaning"
  | "completed"
  | "failed";
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
    // Trạng thái quét bảo mật của file.
    // Không được xem pending là file an toàn.
    scanStatus: {
      type: String,
      enum: ["pending", "scanning", "clean", "infected", "failed"],
      default: "pending",
      required: true,
    },

    // Thời điểm hoàn thành quét.
    scannedAt: {
      type: Date,
      default: null,
    },

    // SHA-256 của nội dung đã kiểm tra.
    fileChecksum: {
      type: String,
      default: null,
    },


    // Phiên bản công cụ hoặc dịch vụ quét.
    scannerVersion: {
      type: String,
      default: null,
    },

    // Token xác định worker đang sở hữu job.
    // Worker chỉ được cập nhật kết quả nếu token còn khớp.
    workerToken: {
      type: String,
      default: null,
    },

    // BƯỚC 10H:
    // Số lần worker đã nhận job để thực hiện quét virus.
    //
    // - Mặc định 0 khi tạo phiên upload.
    // - Tăng 1 mỗi khi worker claim job thành công.
    // - Không tăng khi worker chỉ kiểm tra danh sách job.
    // - Dùng để giới hạn số lần xử lý lại sau lỗi.
    scanAttempts: {
      type: Number,
      default: 0,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "scanAttempts must be a safe integer.",
      },
    },



    // Thời điểm hết hạn quyền xử lý job.
    // Dùng để phát hiện worker bị treo hoặc ngừng hoạt động.
    leaseExpiresAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // BƯỚC 11C - QUẢN LÝ PROMOTION
    // =====================================================

    // pending: Chưa chuyển file sang verified.
    // promoting: Worker đang thực hiện chuyển file.
    // completed: MongoDB đã tham chiếu file verified.
    // failed: Promotion thất bại sau số lần cho phép.
    promotionStatus: {
      type: String,
      enum: ["pending", "promoting", "completed", "failed"],
      default: "pending",
      required: true,
    },

    // Token riêng cho worker promotion.
    promotionToken: {
      type: String,
      default: null,
    },
    promotionVerifiedKey: {
      type: String,
      default: null,
    },

    // Thời điểm hết quyền xử lý promotion.
    promotionLeaseExpiresAt: {
      type: Date,
      default: null,
    },

    // Số lần worker đã nhận promotion job.
    promotionAttempts: {
      type: Number,
      default: 0,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "promotionAttempts must be a safe integer.",
      },
    },

    // Thời điểm hoàn tất promotion.
    promotedAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // BƯỚC 11E.3 - QUẢN LÝ CLEANUP JOB
    // =====================================================

    // Trạng thái cleanup riêng, không dùng chung
    // với scanStatus hoặc promotionStatus.
    cleanupStatus: {
      type: String,
      enum: ["pending", "cleaning", "completed", "failed"],
      default: "pending",
      required: true,
    },

    // Token xác định worker đang sở hữu cleanup job.
    cleanupToken: {
      type: String,
      default: null,
    },

    // Thời điểm hết quyền xử lý cleanup.
    cleanupLeaseExpiresAt: {
      type: Date,
      default: null,
    },

    // Số lần cleanup job đã được claim.
    cleanupAttempts: {
      type: Number,
      default: 0,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "cleanupAttempts must be a safe integer.",
      },
    },

    // Thời điểm hoàn tất cleanup.
    cleanedAt: {
      type: Date,
      default: null,
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


// Hỗ trợ worker tìm các job đang chờ quét.
// Sắp xếp theo thời gian tạo để ưu tiên job cũ.
materialUploadSchema.index({
  scanStatus: 1,
  createdAt: 1,
  _id: 1,
});

// Hỗ trợ truy vấn các job đang quét nhưng hết hạn lease.
// Chưa tự động xử lý lại job ở Bước 10B.
materialUploadSchema.index({
  scanStatus: 1,
  leaseExpiresAt: 1,
});

// =====================================================
// BƯỚC 11C - INDEX CHO PROMOTION WORKER
// =====================================================

// Tìm các file clean đang chờ promotion.
materialUploadSchema.index({
  scanStatus: 1,
  promotionStatus: 1,
  createdAt: 1,
  _id: 1,
});

// Khôi phục promotion job hết lease.
materialUploadSchema.index({
  promotionStatus: 1,
  promotionLeaseExpiresAt: 1,
});

// =====================================================
// BƯỚC 11E.3 - INDEX CHO CLEANUP WORKER
// =====================================================

// Tìm upload cần xem xét cleanup.
materialUploadSchema.index({
  cleanupStatus: 1,
  status: 1,
  expiresAt: 1,
  createdAt: 1,
});

// Recovery cleanup job đã hết lease.
materialUploadSchema.index({
  cleanupStatus: 1,
  cleanupLeaseExpiresAt: 1,
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

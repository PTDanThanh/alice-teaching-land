import mongoose, {
  Schema,
  type InferSchemaType,
} from "mongoose";

// Cấu hình URL iframe cho từng chế độ học.
const ModeSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    embedUrl: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

// Schema bộ thẻ Flashcards.
const FlashcardSetSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    language: {
      type: String,
      enum: ["en", "fr"],
      required: true,
    },

    level: {
      type: String,
      default: "A1",
    },

    quizletUrl: {
      type: String,
      required: true,
    },

    // Các chế độ được Admin cấu hình.
    modes: {
      flashcards: {
        type: ModeSchema,
        required: true,
      },
      learn: {
        type: ModeSchema,
        default: () => ({}),
      },
      test: {
        type: ModeSchema,
        default: () => ({}),
      },
      match: {
        type: ModeSchema,
        default: () => ({}),
      },
      spell: {
        type: ModeSchema,
        default: () => ({}),
      },
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export type FlashcardSetDocument =
  InferSchemaType<typeof FlashcardSetSchema>;

// Tránh lỗi OverwriteModelError khi Next.js hot reload.
const FlashcardSet =
  mongoose.models.FlashcardSet ||
  mongoose.model("FlashcardSet", FlashcardSetSchema);

export default FlashcardSet;
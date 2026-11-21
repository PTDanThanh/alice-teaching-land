import mongoose, { Schema, type InferSchemaType } from "mongoose";

const DictationSegmentSchema = new Schema(
  {
    id: { type: String, required: true },
    startMs: { type: Number, required: true },
    endMs: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const ListeningLessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    language: { type: String, enum: ["en", "fr"], required: true },
    youtubeUrl: { type: String, required: true, trim: true },
    videoId: { type: String, required: true, trim: true },
    transcript: { type: String, required: true },
    segments: { type: [DictationSegmentSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      required: true,
    },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ListeningLessonSchema.index({ status: 1, language: 1, publishedAt: -1 });

export type ListeningLessonDocument = InferSchemaType<
  typeof ListeningLessonSchema
>;
const ListeningLesson =
  mongoose.models.ListeningLesson ||
  mongoose.model("ListeningLesson", ListeningLessonSchema);

export default ListeningLesson;

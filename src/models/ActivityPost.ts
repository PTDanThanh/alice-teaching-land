import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ActivityContentSchema = new Schema(
  { heading: { type: String, trim: true, default: "" }, text: { type: String, trim: true, required: true } },
  { _id: false },
);
const ActivityPostSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, default: "", trim: true },
    category: { type: String, enum: ["learning", "sharing"], required: true },
    image: { type: String, default: null },
    content: { type: [ActivityContentSchema], default: [] },
    // HTML đã được làm sạch trong validation ở phía server.
    contentHtml: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
ActivityPostSchema.index({ status: 1, category: 1, sortOrder: 1 });
export type ActivityPostDocument = InferSchemaType<typeof ActivityPostSchema>;
const ActivityPost = mongoose.models.ActivityPost || mongoose.model("ActivityPost", ActivityPostSchema);
export default ActivityPost;

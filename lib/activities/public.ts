import "server-only";
import connectToDatabase from "@/lib/mongodb";
import ActivityPost from "@/src/models/ActivityPost";
import { activityPosts, type ActivityPost as PublicPost } from "@/data/activities";

export type ActivityPublicPost = PublicPost & {
  contentHtml?: string;
  featured?: boolean;
};

// Chỉ lấy bài đã xuất bản; không trả về bản nháp.
async function publishedPosts(): Promise<ActivityPublicPost[]> {
  await connectToDatabase();
  const rows = await ActivityPost.find({ status: "published" })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .lean();
  return rows.map((row) => ({
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    category: row.category as PublicPost["category"],
    image: typeof row.image === "string" ? row.image : null,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date().toISOString(),
    content: Array.isArray(row.content) ? row.content.map((part: { heading?: string; text?: string }) => ({
      heading: String(part.heading ?? ""), text: String(part.text ?? ""),
    })) : [],
    // HTML được làm sạch lần nữa tại trang chi tiết trước khi render.
    contentHtml: typeof row.contentHtml === "string" ? row.contentHtml : "",
    featured: Boolean(row.featured),
  }));
}

// MongoDB được ưu tiên khi trùng slug với dữ liệu mẫu.
export async function getPublicActivityPosts(): Promise<ActivityPublicPost[]> {
  const databasePosts = await publishedPosts();
  const databaseSlugs = new Set(databasePosts.map((post) => post.slug));
  return [
    ...databasePosts,
    ...activityPosts.filter((post) => !databaseSlugs.has(post.slug)),
  ];
}

export async function getPublicActivityBySlug(slug: string): Promise<ActivityPublicPost | undefined> {
  // Nếu slug thuộc MongoDB nhưng chưa published, không lộ bản nháp.
  await connectToDatabase();
  const row = await ActivityPost.findOne({ slug }).lean();
  if (row) {
    if (row.status !== "published") return undefined;
    return {
      slug: String(row.slug), title: String(row.title), excerpt: String(row.excerpt ?? ""),
      category: row.category as PublicPost["category"],
      image: typeof row.image === "string" ? row.image : null,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date().toISOString(),
      content: Array.isArray(row.content) ? row.content.map((part: { heading?: string; text?: string }) => ({
        heading: String(part.heading ?? ""), text: String(part.text ?? ""),
      })) : [],
      contentHtml: typeof row.contentHtml === "string" ? row.contentHtml : "",
      featured: Boolean(row.featured),
    };
  }
  return activityPosts.find((post) => post.slug === slug);
}

// Giữ content cũ để không làm hỏng bài viết đã lưu.
export type ActivityCategory = "learning" | "sharing";
export type ActivityStatus = "draft" | "published";
export interface ActivityContentBlock { heading: string; text: string }
export interface ActivityPostInput {
  slug: string;
  title: string;
  excerpt: string;
  category: ActivityCategory;
  image: string | null;
  content: ActivityContentBlock[];
  // Nội dung giàu định dạng do Tiptap tạo; bài cũ có thể không có.
  contentHtml?: string;
  status: ActivityStatus;
  featured: boolean;
  sortOrder: number;
}
export interface PublicActivityPost {
  slug: string;
  title: string;
  excerpt: string;
  category: ActivityCategory;
  updatedAt: string;
  image: string | null;
  content: ActivityContentBlock[];
  contentHtml?: string;
}

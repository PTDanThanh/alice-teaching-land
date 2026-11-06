import type { Metadata } from "next";
import ActivityFeed from "./activity-feed";
import { getPublicActivityPosts } from "@/lib/activities/public";

export const metadata: Metadata = {
  title: "Hoạt động | Alice In Teachingland",
  description: "Khám phá các hoạt động, câu chuyện và mẹo học ngoại ngữ cùng Alice In Teachingland.",
};

// Server Component truy vấn DB; ActivityFeed chỉ nhận dữ liệu serializable.
export default async function ActivitiesPage() {
  const posts = await getPublicActivityPosts();
  return <ActivityFeed posts={posts} />;
}

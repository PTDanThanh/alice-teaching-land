import type { Metadata } from "next";
import SkillsHub from "@/components/skills/skills-hub";

export const metadata: Metadata = {
  title: "Luyện 4 kỹ năng | Alice In Teachingland",
  description: "Luyện nghe, nói, đọc, viết tiếng Anh và tiếng Pháp cùng Alice Teaching Land.",
};

export default function SkillsPage() {
  return <SkillsHub />;
}

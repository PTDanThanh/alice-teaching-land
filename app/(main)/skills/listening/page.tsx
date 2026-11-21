import type { Metadata } from "next";
import ListeningDictation from "@/components/skills/listening-dictation";

export const metadata: Metadata = {
  title: "Luyện nghe – Chép chính tả | Alice In Teachingland",
  description: "Nghe từng câu từ video YouTube, chép lại và kiểm tra chính tả tiếng Anh hoặc tiếng Pháp.",
};

export default function ListeningPage() {
  return <ListeningDictation />;
}

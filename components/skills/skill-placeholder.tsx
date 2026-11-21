import Link from "next/link";
import { ArrowLeft, BookOpenText, CheckCircle2, Mic2, PenLine } from "lucide-react";

type ComingSoonSkill = "speaking" | "reading" | "writing";
const content = {
  speaking: { title: "Luyện nói", subtitle: "Speaking Practice", icon: Mic2, features: ["Luyện phát âm theo chủ đề", "Bài hội thoại mẫu", "Ghi âm và luyện nói — sẽ phát triển"] },
  reading: { title: "Luyện đọc", subtitle: "Reading Practice", icon: BookOpenText, features: ["Bài đọc tiếng Anh và tiếng Pháp", "Bộ lọc theo trình độ A1–C2", "Câu hỏi đọc hiểu — sẽ phát triển"] },
  writing: { title: "Luyện viết", subtitle: "Writing Practice", icon: PenLine, features: ["Chủ đề viết theo trình độ", "Không gian soạn thảo bài viết", "Nhận phản hồi về bài viết — sẽ phát triển"] },
};
export default function SkillPlaceholder({ skill }: { skill: ComingSoonSkill }) {
  const c = content[skill]; const Icon = c.icon;
  return <div className="min-h-[70vh] bg-[#faf8ff] px-4 py-12 sm:px-6"><div className="mx-auto max-w-4xl">
    <Link href="/skills" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"><ArrowLeft className="h-4 w-4" /> Tất cả kỹ năng</Link>
    <div className="mt-8 rounded-3xl border border-violet-100 bg-white p-7 shadow-sm sm:p-12"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Icon className="h-8 w-8" /></div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-violet-600">{c.subtitle}</p><h1 className="mt-2 text-4xl font-extrabold text-slate-900">{c.title}</h1><p className="mt-4 max-w-xl leading-7 text-slate-600">Giao diện giới thiệu đã sẵn sàng. Các công nghệ xử lý và bài tập tương tác sẽ được triển khai ở giai đoạn tiếp theo.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">{c.features.map(f => <div key={f} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700"><CheckCircle2 className="mb-3 h-5 w-5 text-violet-500" />{f}</div>)}</div>
      <p className="mt-8 inline-flex rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">Coming soon · Chưa kích hoạt chức năng luyện tập</p>
    </div></div></div>;
}

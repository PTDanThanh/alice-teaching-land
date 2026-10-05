import Link from "next/link";
import { ArrowUpRight, Eye, PanelsTopLeft } from "lucide-react";

const pages = [
  { title: "Trang chủ", description: "Giới thiệu và các khu vực học tập nổi bật.", href: "/home", section: "Trang chính" },
  { title: "Giới thiệu", description: "Thông tin về Alice In Teachingland.", href: "/about", section: "Trang chính" },
  { title: "Thư viện tài liệu", description: "Tài liệu học tập tiếng Anh và tiếng Pháp.", href: "/materials", section: "Học tập" },
  { title: "Hoạt động", description: "Bài viết học tập và nội dung chia sẻ.", href: "/activities", section: "Học tập" },
  { title: "Flashcard", description: "Không gian học từ vựng cùng Quizlet.", href: "/flashcards", section: "Học tập" },
];

export default function AdminPagesPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-violet-700">WEBSITE</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Các trang</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Danh sách các trang đang có và liên kết mở bản xem trước trên website.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => (
          <article key={page.href} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <PanelsTopLeft aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{page.section}</span>
            </div>
            <h2 className="mt-5 font-bold text-slate-900">{page.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{page.description}</p>
            <Link href={page.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900">
              <Eye aria-hidden="true" className="h-4 w-4" />
              Xem trang
              <ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Chỉnh sửa trực tiếp các khối nội dung trang chưa được bật: nội dung hiện nằm trong mã nguồn, chưa có CMS để lưu thay đổi từ dashboard.</p>
    </div>
  );
}

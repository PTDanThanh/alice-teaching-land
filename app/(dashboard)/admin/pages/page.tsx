import Link from "next/link";
import { ArrowRight, Eye, PanelsTopLeft } from "lucide-react";

type WebsitePage = {
  key: string;
  title: string;
  description: string;
  href: string;
  section: string;
  manageHref?: string;
};

const pages: WebsitePage[] = [
  {
    key: "home",
    title: "Trang chủ",
    description: "Giới thiệu và các khu vực học tập nổi bật.",
    href: "/home",
    section: "Trang chính",
    manageHref: "/admin/pages/home",
  },
  {
    key: "about",
    title: "Giới thiệu",
    description: "Thông tin về Alice In Teachingland.",
    href: "/about",
    section: "Trang chính",
  },
  {
    key: "materials",
    title: "Thư viện tài liệu",
    description: "Tài liệu học tập tiếng Anh và tiếng Pháp.",
    href: "/materials",
    section: "Học tập",
  },
  {
    key: "activities",
    title: "Hoạt động",
    description: "Bài viết học tập và nội dung chia sẻ.",
    href: "/activities",
    section: "Học tập",
  },
  {
    key: "flashcards",
    title: "Flashcard",
    description: "Không gian học từ vựng cùng Quizlet.",
    href: "/flashcards",
    section: "Học tập",
  },
];

export default function AdminPagesPage() {
  return (
    <div className="space-y-6">


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => (
          <article
            key={page.key}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <PanelsTopLeft
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </span>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {page.section}
              </span>
            </div>

            <h2 className="mt-5 font-bold text-slate-900">
              {page.title}
            </h2>

            <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
              {page.description}
            </p>

            <div className="mt-5 flex items-center justify-end gap-3">

              {page.manageHref ? (
                <Link
                  href={page.manageHref}
                  aria-label={`Quản lý nội dung ${page.title}`}
                  title={`Quản lý nội dung ${page.title}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-500"
                >
                  <ArrowRight
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </Link>
              ) : (
                <span className="text-xs text-slate-400">
                  Chưa bật chỉnh sửa
                </span>
              )}
            </div>
          </article>
        ))}
      </div>

    </div>
  );
}
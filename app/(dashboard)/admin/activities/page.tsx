import Link from "next/link";
import { ArrowUpRight, BookOpenText } from "lucide-react";

import { activityCategoryLabels, activityPosts, formatActivityDate } from "@/data/activities";

export default function AdminActivitiesPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-violet-700">NỘI DUNG HỌC TẬP</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Hoạt động</h1>
          <p className="mt-2 text-sm text-slate-500">{activityPosts.length} bài viết trong dữ liệu hiện tại.</p>
        </div>
        <Link href="/activities" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800">
          Xem trang hoạt động <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </header>
      <div className="grid gap-4 xl:grid-cols-2">
        {activityPosts.map((post) => (
          <article key={post.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><BookOpenText aria-hidden="true" className="h-5 w-5" /></span>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{activityCategoryLabels[post.category]}</span>
            </div>
            <h2 className="mt-4 font-bold leading-6 text-slate-900">{post.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{post.excerpt}</p>
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <time dateTime={post.updatedAt} className="text-xs text-slate-500">Cập nhật {formatActivityDate(post.updatedAt)}</time>
              <Link href={`/activities/${post.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900">
                Xem bài <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Các bài viết hiện được lưu trong mã nguồn. Chức năng chỉnh sửa và xuất bản từ dashboard cần kết nối CMS hoặc MongoDB trước.</p>
    </div>
  );
}

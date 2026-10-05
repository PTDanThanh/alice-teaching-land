import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  FileText,
  PanelsTopLeft,
  Sparkles,
} from "lucide-react";

import { activityPosts } from "@/data/activities";
import { materials } from "@/data/materials";

const statCards = [
  {
    label: "Trang website",
    value: "6",
    note: "Trang đang hoạt động",
    Icon: PanelsTopLeft,
    color: "bg-violet-100 text-violet-700",
  },
  {
    label: "Tài liệu",
    value: String(materials.length),
    note: "Trong thư viện học tập",
    Icon: FileText,
    color: "bg-sky-100 text-sky-700",
  },
  {
    label: "Bài hoạt động",
    value: String(activityPosts.length),
    note: "Bài viết đã tạo",
    Icon: BookOpenText,
    color: "bg-amber-100 text-amber-700",
  },
];

const quickLinks = [
  {
    href: "/admin/pages",
    title: "Quản lý các trang",
    description: "Xem cấu trúc các trang công khai và mở bản xem trước.",
    Icon: PanelsTopLeft,
    color: "bg-violet-100 text-violet-700",
  },
  {
    href: "/admin/materials",
    title: "Thư viện tài liệu",
    description: "Theo dõi tài liệu, định dạng và trình độ học tập.",
    Icon: FileText,
    color: "bg-sky-100 text-sky-700",
  },
  {
    href: "/admin/activities",
    title: "Bài viết hoạt động",
    description: "Xem danh sách bài học và nội dung chia sẻ.",
    Icon: BookOpenText,
    color: "bg-amber-100 text-amber-700",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 rounded-3xl bg-linear-to-r from-[#38236F] to-[#6545C5] p-6 text-white shadow-xl shadow-violet-900/10 sm:p-9 lg:flex-row lg:items-center">
        <div>
          {/* <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-violet-50">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            ADMIN WORKSPACE
          </span> */}
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Chào mừng trở lại!
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-violet-100 sm:text-base">
            Tổng quan nội dung và khu vực quản trị Alice In Teachingland.
          </p>
        </div>

      </section>

      <section aria-label="Thống kê nội dung" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map(({ label, value, note, Icon, color }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 text-xs text-slate-500">{note}</p>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Truy cập nhanh</h2>
          <p className="mt-1 text-sm text-slate-500">Các khu vực nội dung của website</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {quickLinks.map(({ href, title, description, Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md sm:p-6"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="mt-5 flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900">{title}</h3>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-slate-400 transition group-hover:text-violet-700" />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      <p className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-900">
        Nội dung website hiện được khai báo trong các module dữ liệu tĩnh. Khu vực này đã có kiểm tra quyền admin; để các thao tác chỉnh sửa cập nhật website và lưu bền vững, cần kết nối CMS/database cho từng loại nội dung.
      </p>
    </div>
  );
}

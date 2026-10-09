import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";

import { formatMaterialDate, materialFormats, materials } from "@/data/materials";

export default function AdminMaterialsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-violet-700">NỘI DUNG HỌC TẬP</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tài liệu</h1>
          <p className="mt-2 text-sm text-slate-500">{materials.length} tài liệu trong dữ liệu hiện tại.</p>
        </div>
        <Link href="/materials" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800">
          Xem thư viện <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </header>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-4 font-semibold">Tài liệu</th><th className="px-5 py-4 font-semibold">Định dạng</th><th className="px-5 py-4 font-semibold">Ngôn ngữ</th><th className="px-5 py-4 font-semibold">Trình độ</th><th className="px-5 py-4 font-semibold">Cập nhật</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materials.map((material) => (
                <tr key={material.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><FileText aria-hidden="true" className="h-4 w-4" /></span><div><p className="font-semibold text-slate-800">{material.title}</p><p className="mt-1 text-xs text-slate-500">{material.collection}</p></div></div></td>
                  <td className="px-5 py-4 text-slate-600">{materialFormats[material.type].label}</td>
                  <td className="px-5 py-4 text-slate-600">{material.language === "en" ? "Tiếng Anh" : "Tiếng Pháp"}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{material.level}</span></td>
                  <td className="px-5 py-4 text-slate-500">{formatMaterialDate(material.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Danh sách này đang đọc dữ liệu tĩnh từ mã nguồn. Thêm/sửa/xóa tài liệu từ dashboard cần chuyển nguồn dữ liệu sang CMS hoặc MongoDB trước.</p>
    </div>
  );
}

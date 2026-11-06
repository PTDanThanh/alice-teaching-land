"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, Search, Trash2 } from "lucide-react";
import type { ActivityPostInput } from "@/lib/activities/types";
import ActivityEditModal from "./activity-edit-modal";
import type { ActivityRow } from "./activity-form";

const categoryLabels = { learning: "Góc học tập", sharing: "Chia sẻ" };
function shortDescription(post: ActivityRow) {
  const text = post.content.find((block) => block.text.trim())?.text ?? post.excerpt ?? "";
  return text.length > 125 ? `${text.slice(0, 125).trimEnd()}...` : text || "Chưa có nội dung";
}
function formatDate(date: string) { const d = new Date(date); return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(d); }

export default function ActivityAdmin() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<ActivityRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/activities", { cache: "no-store" });
    const data: unknown = await response.json();
    if (!response.ok) throw new Error(typeof data === "object" && data !== null && "error" in data ? String(data.error) : "Không tải được bài viết");
    if (!Array.isArray(data)) throw new Error("Dữ liệu danh sách không hợp lệ");
    setRows(data as ActivityRow[]);
  }
  useEffect(() => {
    let cancelled = false;
    // Lần tải đầu tách riêng để không setState đồng bộ trong effect.
    fetch("/api/admin/activities", { cache: "no-store" }).then(async (r) => {
      const d: unknown = await r.json();
      if (!r.ok) throw new Error(typeof d === "object" && d !== null && "error" in d ? String(d.error) : "Không tải được bài viết");
      if (!Array.isArray(d)) throw new Error("Dữ liệu không hợp lệ");
      if (!cancelled) setRows(d as ActivityRow[]);
    }).catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const filtered = useMemo(() => rows.filter((p) => {
    const match = filter === "all" || p.status === filter;
    const q = query.toLocaleLowerCase("vi").trim();
    return match && (!q || `${p.title} ${p.slug} ${p.excerpt} ${p.content.map((b) => b.text).join(" ")}`.toLocaleLowerCase("vi").includes(q));
  }), [rows, query, filter]);
  async function changeStatus(post: ActivityRow) {
    const next: ActivityPostInput = { ...post, status: post.status === "draft" ? "published" : "draft" };
    if (next.status === "published" && (!next.excerpt.trim() || !next.content.some((b) => b.text.trim()))) {
      setError("Bài viết cần có mô tả ngắn và nội dung trước khi xuất bản."); return;
    }
    setBusyId(post._id); setError("");
    try {
      const r = await fetch(`/api/admin/activities/${post._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Không cập nhật được trạng thái");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Có lỗi xảy ra"); }
    finally { setBusyId(null); }
  }
  async function remove(post: ActivityRow) {
    if (!window.confirm(`Xóa vĩnh viễn bài viết “${post.title}”?`)) return;
    setBusyId(post._id); setError("");
    try {
      const r = await fetch(`/api/admin/activities/${post._id}`, { method: "DELETE" });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Không xóa được bài viết");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Có lỗi xảy ra"); }
    finally { setBusyId(null); }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-violet-700">NỘI DUNG HỌC TẬP</p><h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Quản lý bài viết Activity</h1><p className="mt-2 text-sm text-slate-500">{rows.length} bài viết trong MongoDB</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/activities" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Xem trang hoạt động <ArrowUpRight className="h-4 w-4" /></Link>
          <Link href="/admin/activities/create" className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800"><Plus className="h-4 w-4" />Tạo bài viết</Link></div>
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[220px] flex-1"><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Tìm bài viết" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm bài viết..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm" /></div>
          <select aria-label="Lọc trạng thái" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">Tất cả trạng thái</option><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option></select>
        </div>
        {error && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Tên bài viết", "Chủ đề", "Mô tả", "Ngày cập nhật", "Trạng thái", "Thao tác"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map((post) => <tr key={post._id} tabIndex={0} role="button" aria-label={`Chỉnh sửa bài viết ${post.title}`} onClick={() => setEditing(post)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setEditing(post); } }} className="cursor-pointer hover:bg-violet-50/50 focus-visible:outline-2 focus-visible:outline-violet-500">
            <td className="max-w-[220px] px-4 py-4 font-semibold text-slate-900">{post.title}</td><td className="whitespace-nowrap px-4 py-4">{categoryLabels[post.category] ?? post.category}</td>
            <td className="max-w-[320px] px-4 py-4 text-slate-500"><p className="line-clamp-2">{shortDescription(post)}</p></td><td className="whitespace-nowrap px-4 py-4 text-slate-500">{formatDate(post.updatedAt)}</td>
            <td className="whitespace-nowrap px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${post.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{post.status === "published" ? "Đã xuất bản" : "Bản nháp"}</span></td>
            <td className="px-4 py-4"><div className="flex items-center gap-2"><button type="button" disabled={busyId === post._id} onClick={(e) => { e.stopPropagation(); void changeStatus(post); }} className="whitespace-nowrap rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 disabled:opacity-50">{post.status === "published" ? "Gỡ xuất bản" : "Xuất bản"}</button><button type="button" aria-label={`Xóa ${post.title}`} disabled={busyId === post._id} onClick={(e) => { e.stopPropagation(); void remove(post); }} className="rounded-lg border border-red-100 p-2 text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div></td>
          </tr>)}</tbody></table></div>
        <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">{loading ? "Đang tải..." : `Hiển thị ${filtered.length} / ${rows.length} bài viết`}</p>
      </section>
      {editing && <ActivityEditModal key={editing._id} post={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

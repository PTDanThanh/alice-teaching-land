"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActivityPostInput } from "@/lib/activities/types";
import ActivityForm, { emptyActivity } from "@/components/admin/activities/activity-form";

export default function CreateActivityPage() {
  const router = useRouter();
  const [form, setForm] = useState<ActivityPostInput>(emptyActivity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(status: ActivityPostInput["status"]) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tạo được bài viết");
      router.push("/admin/activities"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Có lỗi xảy ra"); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin/activities" className="text-sm font-semibold text-violet-700 hover:underline">← Danh sách bài viết</Link><h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Tạo bài viết mới</h1></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void submit("draft")} className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 disabled:opacity-50">Lưu bản nháp</button><button type="button" disabled={busy} onClick={() => void submit("published")} className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Xuất bản"}</button></div></header>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <ActivityForm idPrefix="create-activity" value={form} onChange={setForm} />
    </div>
  );
}

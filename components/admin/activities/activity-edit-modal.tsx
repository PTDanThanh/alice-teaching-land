"use client";

import { useEffect, useState } from "react";
import type { ActivityPostInput } from "@/lib/activities/types";
import ActivityForm, { type ActivityRow } from "./activity-form";

type Props = { post: ActivityRow; onClose: () => void; onSaved: () => Promise<void> };
export default function ActivityEditModal({ post, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ActivityPostInput>(() => ({ ...post }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/activities/${encodeURIComponent(post._id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không lưu được bài viết");
      await onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Có lỗi xảy ra"); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 sm:p-8" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="activity-modal-title" className="mx-auto my-4 max-w-6xl rounded-3xl bg-[#F6F7FB] p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4"><h2 id="activity-modal-title" className="text-xl font-bold">Chỉnh sửa bài viết</h2>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">Đóng</button></div>
        <ActivityForm idPrefix="edit-activity" value={form} onChange={setForm} />
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">Hủy</button>
          <button type="button" onClick={save} disabled={busy} className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
      </section>
    </div>
  );
}

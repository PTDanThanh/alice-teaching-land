"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Headphones, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ListeningLessonRecord } from "@/lib/skills/types";
type LessonForm = {
  title: string;
  language: "en" | "fr";
  youtubeUrl: string;
  transcript: string;
  status: "draft" | "published";
};
const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

const emptyForm: LessonForm = {
  title: "",
  language: "en",
  youtubeUrl: "",
  transcript: "",
  status: "draft",
};

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    return String(data.error);
  }
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

export default function SkillAdmin() {
  const [lessons, setLessons] = useState<ListeningLessonRecord[]>([]);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [transcribeError, setTranscribeError] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [acknowledgedRights, setAcknowledgedRights] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modalOpen && !dialog.open) dialog.showModal();
    if (!modalOpen && dialog.open) dialog.close();
  }, [modalOpen]);

  async function generateTranscript() {
    if (transcribing || saving || !acknowledgedRights) return;
    setTranscribing(true);
    setTranscribeError("");
    const requestUrl = form.youtubeUrl;
    const requestLanguage = form.language;
    try {
      const response = await fetch("/api/admin/skills/listening/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: requestUrl, language: requestLanguage, acknowledgedRights }),
      });
      const data: unknown = await readJson(response);
      if (!response.ok) throw new Error(getErrorMessage(data, "Không thể tạo transcript"));
      if (!data || typeof data !== "object" || !("transcript" in data) || typeof data.transcript !== "string") {
        throw new Error("Máy chủ trả transcript không hợp lệ.");
      }
      // Do not overwrite a manually edited transcript or one for another video.
      setForm((current) => {
        if (current.youtubeUrl !== requestUrl || current.language !== requestLanguage) return current;
        return { ...current, transcript: data.transcript as string };
      });
    } catch (cause) {
      setTranscribeError(cause instanceof Error ? cause.message : "Không thể tạo transcript.");
    } finally { setTranscribing(false); }
  }


  const loadLessons = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/skills/listening", {
      cache: "no-store",
      signal,
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(getErrorMessage(data, "Không tải được bài luyện nghe"));
    if (!Array.isArray(data)) throw new Error("Dữ liệu danh sách bài luyện nghe không hợp lệ");
    return data as ListeningLessonRecord[];
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadLessons(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setLessons(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setListError(cause instanceof Error ? cause.message : "Không tải được dữ liệu");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loadLessons]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setTranscribeError("");
    setAcknowledgedRights(false);
    setModalOpen(true);
  }

  function openEdit(lesson: ListeningLessonRecord) {
    setEditingId(lesson._id);
    setForm({
      title: lesson.title,
      language: lesson.language,
      youtubeUrl: lesson.youtubeUrl,
      transcript: lesson.transcript,
      status: lesson.status,
    });
    setFormError("");
    setTranscribeError("");
    setAcknowledgedRights(false);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving || transcribing) return;
    setModalOpen(false);
    setFormError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || transcribing) return;
    setSaving(true);
    setFormError("");
    setListError("");
    try {
      const response = await fetch(
        editingId ? `/api/admin/skills/listening/${encodeURIComponent(editingId)}` : "/api/admin/skills/listening",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await readJson(response);
      if (!response.ok) throw new Error(getErrorMessage(data, "Không lưu được bài luyện nghe"));

      // The write succeeded: close the modal even if list refreshing fails.
      setModalOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      try {
        setLessons(await loadLessons());
      } catch (cause) {
        setListError(
          cause instanceof Error ? `Đã lưu nhưng không tải lại được danh sách: ${cause.message}` : "Đã lưu nhưng không tải lại được danh sách",
        );
      }
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Không lưu được bài luyện nghe");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(lesson: ListeningLessonRecord) {
    if (!window.confirm(`Xóa bài luyện nghe “${lesson.title}”?`)) return;
    setListError("");
    setDeletingId(lesson._id);
    try {
      const response = await fetch(`/api/admin/skills/listening/${encodeURIComponent(lesson._id)}`, {
        method: "DELETE",
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(getErrorMessage(data, "Không xóa được bài luyện nghe"));
      setLessons((current) => current.filter((item) => item._id !== lesson._id));
      if (editingId === lesson._id) closeModal();
    } catch (cause) {
      setListError(cause instanceof Error ? cause.message : "Không xóa được bài luyện nghe");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Quản lý kỹ năng nghe</h1>
          <p className="mt-2 text-sm text-slate-500">
            Quản lý các bài nghe theo câu và xuất bản cho người học.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Thêm bài luyện nghe
        </button>
      </header>

      {listError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{listError}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Danh sách bài luyện nghe</h2>
          <p className="mt-1 text-sm text-slate-500">{lessons.length} bài trong hệ thống</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Tên bài", "Ngôn ngữ", "Số câu", "Trạng thái", "Thao tác"].map((heading) => (
                  <th key={heading} scope="col" className="px-5 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lessons.map((lesson) => (
                <tr key={lesson._id}>
                  <td className="px-5 py-4 font-semibold text-slate-900">{lesson.title}</td>
                  <td className="px-5 py-4 text-slate-600">{lesson.language === "fr" ? "Français" : "English"}</td>
                  <td className="px-5 py-4 text-slate-600">{lesson.segments.length}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lesson.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {lesson.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(lesson)}
                        aria-label={`Sửa ${lesson.title}`}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-500"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId !== null}
                        onClick={() => void deleteLesson(lesson)}
                        aria-label={`Xóa ${lesson.title}`}
                        className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-40"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && lessons.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Chưa có bài luyện nghe nào.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
          {loading ? "Đang tải..." : `Hiển thị ${lessons.length} bài luyện nghe`}
        </p>
      </section>

    <dialog
      ref={dialogRef}
      aria-labelledby="listening-modal-title"
      aria-describedby="listening-modal-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving && !transcribing) closeModal();
      }}
      onClick={(event) => {
        // Click on the dialog backdrop, not on its inner content.
        if (event.target === event.currentTarget && !saving && !transcribing) closeModal();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Headphones aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="listening-modal-title" className="text-xl font-bold">
                {editingId !== null ? "Chỉnh sửa bài luyện nghe" : "Thêm bài luyện nghe"}
              </h2>
              <p id="listening-modal-description" className="mt-1 text-sm leading-6 text-slate-500">
                Bài học chỉ hiển thị với người học khi được xuất bản.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving || transcribing}
            onClick={closeModal}
            aria-label="Đóng cửa sổ"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Tên bài luyện
            <input
              autoFocus
              required
              maxLength={160}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ví dụ: A day at the market"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Ngôn ngữ
            <select
              value={form.language}
              onChange={(event) =>
                setForm({ ...form, language: event.target.value === "fr" ? "fr" : "en" })
              }
              className={fieldClass}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Link video YouTube
          <input
            required
            type="url"
            value={form.youtubeUrl}
            onChange={(event) => setForm({ ...form, youtubeUrl: event.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className={fieldClass}
          />
        </label>

        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={acknowledgedRights} onChange={(event) => setAcknowledgedRights(event.target.checked)} className="mt-1 accent-violet-700" />
            <span>Tôi xác nhận có quyền tải và xử lý nội dung video này theo điều khoản áp dụng.</span>
          </label>
          <button type="button" disabled={saving || transcribing || !acknowledgedRights || !form.youtubeUrl.trim()}
            onClick={() => void generateTranscript()}
            className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-violet-800">
            {transcribing ? "Đang nhận dạng giọng nói..." : "Tự động tạo transcript"}
          </button>
          <p className="text-xs leading-5 text-slate-500">Dùng yt-dlp, FFmpeg và whisper.cpp trên máy chủ Next.js. Chỉ xử lý video có quyền tải, tối đa 12 phút. Transcript sẽ điền vào ô bên dưới để bạn duyệt trước khi lưu.</p>
          {transcribeError && <p role="alert" className="text-sm text-red-700">{transcribeError}</p>}
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Transcript có timestamp
          <span className="mt-1 block font-normal text-slate-500">
            Mỗi dòng: MM:SS.mmm --&gt; MM:SS.mmm | Nội dung câu
          </span>
          <textarea
            required
            rows={8}
            spellCheck={false}
            value={form.transcript}
            onChange={(event) => setForm({ ...form, transcript: event.target.value })}
            placeholder={
              "00:00.000 --> 00:03.500 | Hello everyone.\n00:03.500 --> 00:07.200 | Welcome to our English lesson."
            }
            className={`${fieldClass} resize-y font-mono text-sm leading-6`}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            Trạng thái
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value === "published" ? "published" : "draft" })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-violet-500"
            >
              <option value="draft">Bản nháp</option>
              <option value="published">Xuất bản</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving || transcribing}
              onClick={closeModal}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || transcribing}
              className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : editingId !== null ? "Lưu thay đổi" : "Tạo bài"}
            </button>
          </div>
        </div>
      </form>
    </dialog>

    </div>
  );
}

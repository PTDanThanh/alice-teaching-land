
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Headphones,
  Pencil,
  Plus,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

import type { ListeningLessonRecord } from "@/lib/skills/types";

type LessonForm = {
  title: string;
  language: "en" | "fr";
  youtubeUrl: string;
  transcript: string;
  status: "draft" | "published";
};

const emptyForm: LessonForm = {
  title: "",
  language: "en",
  youtubeUrl: "",
  transcript: "",
  status: "draft",
};

function getErrorMessage(data: unknown, fallback: string) {
  return typeof data === "object" &&
    data !== null &&
    "error" in data
    ? String(data.error)
    : fallback;
}

export default function SkillAdmin() {
  const [lessons, setLessons] = useState<ListeningLessonRecord[]>([]);
  const [form, setForm] = useState<LessonForm>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [transcribeError, setTranscribeError] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [acknowledgedRights, setAcknowledgedRights] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const transcribingRef = useRef(false);

  const loadLessons = useCallback(async () => {
    const response = await fetch("/api/admin/skills/listening", {
      cache: "no-store",
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(data, "Không tải được bài luyện nghe")
      );
    }

    if (!Array.isArray(data)) {
      throw new Error("Dữ liệu danh sách bài luyện nghe không hợp lệ");
    }

    return data as ListeningLessonRecord[];
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadLessons()
      .then((data) => {
        if (!cancelled) setLessons(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được dữ liệu"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadLessons]);

  function openCreateModal() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalError("");
    setTranscribeError("");
    setAcknowledgedRights(false);
    setIsModalOpen(true);
  }

  function openEditModal(lesson: ListeningLessonRecord) {
    setEditingId(lesson._id);

    setForm({
      title: lesson.title,
      language: lesson.language,
      youtubeUrl: lesson.youtubeUrl,
      transcript: lesson.transcript,
      status: lesson.status,
    });

    setModalError("");
    setTranscribeError("");
    setAcknowledgedRights(false);
    setIsModalOpen(true);
  }

  const closeModal = useCallback(() => {
    if (saving || transcribing || transcribingRef.current) return;

    setIsModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalError("");
    setTranscribeError("");
    setAcknowledgedRights(false);
  }, [saving, transcribing]);

  async function generateTranscript() {
    if (
      transcribingRef.current ||
      saving ||
      !acknowledgedRights ||
      !form.youtubeUrl.trim()
    ) {
      return;
    }

    if (
      form.transcript.trim() &&
      !window.confirm(
        "Transcript hiện có sẽ bị thay thế bằng kết quả tự động. Bạn có muốn tiếp tục không?"
      )
    ) {
      return;
    }

    transcribingRef.current = true;
    setTranscribing(true);
    setTranscribeError("");

    try {
      const response = await fetch(
        "/api/admin/skills/listening/transcribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youtubeUrl: form.youtubeUrl,
            language: form.language,
            acknowledgedRights: true,
          }),
        }
      );

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Không thể tự động tạo transcript.")
        );
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("transcript" in data) ||
        typeof data.transcript !== "string" ||
        !data.transcript.trim()
      ) {
        throw new Error("Máy chủ trả về transcript không hợp lệ.");
      }

      const transcript = data.transcript;
      setForm((current) => ({
        ...current,
        transcript,
      }));
    } catch (cause) {
      setTranscribeError(
        cause instanceof Error
          ? cause.message
          : "Không thể tự động tạo transcript."
      );
    } finally {
      transcribingRef.current = false;
      setTranscribing(false);
    }
  }

  // Khóa cuộn trang và hỗ trợ đóng modal bằng Escape.
  useEffect(() => {
    if (!isModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);

      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [isModalOpen, closeModal]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || transcribing || transcribingRef.current) return;

    setSaving(true);
    setModalError("");

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/skills/listening/${editingId}`
          : "/api/admin/skills/listening",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Không lưu được bài luyện nghe")
        );
      }

      // Lưu thành công: đóng modal rồi tải lại danh sách.
      setIsModalOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      setError("");

      try {
        setLessons(await loadLessons());
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Đã lưu nhưng không tải lại được danh sách"
        );
      }
    } catch (cause) {
      setModalError(
        cause instanceof Error
          ? cause.message
          : "Không lưu được bài luyện nghe"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(lesson: ListeningLessonRecord) {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa bài luyện nghe "${lesson.title}"?`
      )
    ) {
      return;
    }

    setDeletingId(lesson._id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/skills/listening/${lesson._id}`,
        { method: "DELETE" }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Không xóa được bài luyện nghe")
        );
      }

      setLessons((current) =>
        current.filter((item) => item._id !== lesson._id)
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không xóa được bài luyện nghe"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Quản lý kỹ năng nghe
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Tạo và quản lý các bài luyện nghe chép chính tả.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800"
        >
          <Plus className="h-4 w-4" />
          Thêm bài luyện nghe
        </button>
      </header>

      {/* Global Error */}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Lessons Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">
            Danh sách bài luyện nghe
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {lessons.length} bài trong hệ thống
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Tên bài",
                  "Ngôn ngữ",
                  "Số câu",
                  "Trạng thái",
                  "Thao tác",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 font-semibold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {lessons.map((lesson) => (
                <tr
                  key={lesson._id}
                  className="transition hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {lesson.title}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {lesson.language === "fr"
                      ? "Français"
                      : "English"}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {lesson.segments.length}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lesson.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                        }`}
                    >
                      {lesson.status === "published"
                        ? "Đã xuất bản"
                        : "Bản nháp"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(lesson)}
                        aria-label={`Sửa ${lesson.title}`}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteLesson(lesson)}
                        disabled={deletingId !== null}
                        aria-label={`Xóa ${lesson.title}`}
                        className="rounded-lg border border-red-100 p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                      >
                        {deletingId === lesson._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && lessons.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Chưa có bài luyện nghe nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
          {loading
            ? "Đang tải..."
            : `Hiển thị ${lessons.length} bài luyện nghe`}
        </p>
      </section>

      {/* Modal: Create / Edit */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[3px] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-modal-title"
            className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl"
            style={{ maxHeight: "calc(100dvh - 32px)" }}
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <Headphones className="h-5 w-5" />
                </div>

                <div>
                  <h2
                    id="lesson-modal-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    {editingId
                      ? "Chỉnh sửa bài luyện nghe"
                      : "Thêm bài luyện nghe"}
                  </h2>

                  <p className="text-xs text-slate-500 sm:text-sm">
                    Nhập thông tin và transcript của bài học.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving || transcribing}
                aria-label="Đóng modal"
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              id="listening-lesson-form"
              onSubmit={submit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
                {modalError && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                  >
                    {modalError}
                  </p>
                )}

                {/* Title and Language */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Tên bài luyện
                    <input
                      required
                      autoFocus
                      maxLength={160}
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      disabled={transcribing}
                      placeholder="Ví dụ: A day at the market"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Ngôn ngữ
                    <select
                      value={form.language}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          language:
                            event.target.value === "fr" ? "fr" : "en",
                        }))
                      }
                      disabled={transcribing}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                  </label>
                </div>

                {/* YouTube URL */}
                <label className="block text-sm font-semibold text-slate-700">
                  Link video YouTube
                  <input
                    required
                    type="url"
                    value={form.youtubeUrl}
                    onChange={(event) => {
                      const youtubeUrl = event.target.value;
                      setForm((current) => ({ ...current, youtubeUrl }));
                      setAcknowledgedRights(false);
                      setTranscribeError("");
                    }}
                    disabled={transcribing}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </label>

                <section
                  aria-label="Tạo transcript tự động"
                  className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4"
                >
                  <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                    <input
                      type="checkbox"
                      checked={acknowledgedRights}
                      disabled={transcribing}
                      onChange={(event) =>
                        setAcknowledgedRights(event.target.checked)
                      }
                      className="mt-1 accent-violet-700"
                    />
                    <span>
                      Tôi xác nhận có quyền tải và xử lý video tại đường dẫn
                      trên. Video không bị giới hạn truy cập.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => void generateTranscript()}
                    disabled={
                      saving ||
                      transcribing ||
                      !acknowledgedRights ||
                      !form.youtubeUrl.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {transcribing && (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    )}
                    {transcribing
                      ? "Đang tạo transcript..."
                      : "Tự động tạo transcript"}
                  </button>

                  <p className="text-xs leading-5 text-slate-500">
                    Server xử lý bằng yt-dlp, FFmpeg và whisper.cpp. Chỉ video
                    bạn có quyền sử dụng, tối đa 12 phút. Transcript được điền
                    vào ô bên dưới để bạn kiểm tra; thao tác này không lưu hay
                    xuất bản bài.
                  </p>

                  {transcribeError && (
                    <p
                      role="alert"
                      className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                    >
                      {transcribeError}
                    </p>
                  )}
                </section>

                {/* Transcript */}
                <label className="block text-sm font-semibold text-slate-700">
                  Transcript có timestamp

                  <span className="mt-1 block font-normal text-slate-500">
                    Mỗi dòng: MM:SS.mmm --&gt; MM:SS.mmm | Nội dung câu
                  </span>

                  <textarea
                    required
                    rows={9}
                    spellCheck={false}
                    value={form.transcript}
                    disabled={transcribing}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        transcript: event.target.value,
                      }))
                    }
                    placeholder={
                      "00:00.000 --> 00:03.500 | Hello everyone.\n00:03.500 --> 00:07.200 | Welcome to our English lesson."
                    }
                    className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-4 font-mono text-sm leading-6 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </label>

                {/* Status */}
                <label className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
                  Trạng thái
                  <select
                    value={form.status}
                    disabled={transcribing}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status:
                          event.target.value === "published"
                            ? "published"
                            : "draft",
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal outline-none focus:border-violet-500"
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Xuất bản</option>
                  </select>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving || transcribing}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving || transcribing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}

                  {saving
                    ? "Đang lưu..."
                    : editingId
                      ? "Lưu thay đổi"
                      : "Tạo bài"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

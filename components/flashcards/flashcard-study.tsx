
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  GraduationCap,
  Headphones,
  Layers3,
  LayoutGrid,
  ClipboardCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { validateQuizletUrl } from "@/lib/quizlet-url";

// Các chế độ học được hỗ trợ trong Admin.
// Write không còn là chế độ nhúng độc lập.
const studyModes = [
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Ôn tập bằng thẻ từ",
    icon: Layers3,
  },
  {
    id: "learn",
    label: "Learn",
    description: "Học từng bước",
    icon: GraduationCap,
  },
  {
    id: "test",
    label: "Test",
    description: "Kiểm tra kiến thức",
    icon: ClipboardCheck,
  },
  {
    id: "match",
    label: "Match",
    description: "Ghép cặp",
    icon: LayoutGrid,
  },
  {
    id: "spell",
    label: "Spell",
    description: "Nghe và đánh vần",
    icon: Headphones,
  },
] as const;

type StudyModeKey = (typeof studyModes)[number]["id"];

type ModeConfig = {
  enabled: boolean;
  embedUrl: string;
};

type FlashcardSet = {
  _id: string;
  slug: string;
  title: string;
  description: string;
  language: "en" | "fr";
  level: string;
  quizletUrl: string;
  status?: "draft" | "published";
  modes: Record<StudyModeKey, ModeConfig>;
};

export default function FlashcardStudy({
  id,
}: {
  id: string;
}) {
  // id từ route thực chất là slug của bộ thẻ.
  const [selectedSet, setSelectedSet] =
    useState<FlashcardSet | null>(null);

  const [activeMode, setActiveMode] =
    useState<StudyModeKey>("flashcards");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Lấy chi tiết bộ thẻ từ MongoDB thông qua Public API.
  useEffect(() => {
    const controller = new AbortController();

    async function loadFlashcard() {
      setLoading(true);
      setError("");
      setNotFound(false);
      setSelectedSet(null);
      setActiveMode("flashcards");

      try {
        const response = await fetch(
          `/api/flashcards/${encodeURIComponent(id)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (response.status === 404) {
          setNotFound(true);
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Không tải được bộ thẻ (${response.status}).`,
          );
        }

        const data: FlashcardSet = await response.json();

        if (!data || !data.slug || !data.modes) {
          throw new Error("Dữ liệu bộ thẻ không hợp lệ.");
        }

        // Chặn bản nháp nếu API vô tình trả về.
        // Quyền truy cập thực tế vẫn phải được kiểm tra ở API.
        if (data.status && data.status !== "published") {
          setNotFound(true);
          return;
        }

        if (!controller.signal.aborted) {
          setSelectedSet(data);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải bộ thẻ.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadFlashcard();

    return () => controller.abort();
  }, [id, reloadKey]);

  // Chỉ bật các chế độ có URL nhúng hợp lệ.
  const availableModes = useMemo(() => {
    if (!selectedSet) return [];

    return studyModes.filter((mode) => {
      const config = selectedSet.modes?.[mode.id];

      return Boolean(
        config?.enabled &&
        validateQuizletUrl(config.embedUrl, true),
      );
    });
  }, [selectedSet]);

  // Ưu tiên Flashcards, nếu không có thì chọn chế độ hợp lệ đầu tiên.
  const effectiveMode = availableModes.some(
    (mode) => mode.id === activeMode,
  )
    ? activeMode
    : availableModes[0]?.id;

  const embedUrl =
    selectedSet && effectiveMode
      ? validateQuizletUrl(
        selectedSet.modes[effectiveMode].embedUrl,
        true,
      )
      : null;

  const quizletUrl = selectedSet
    ? validateQuizletUrl(selectedSet.quizletUrl)
    : null;

  // Trạng thái đang tải.
  if (loading) {
    return (
      <main className="flex min-h-[65vh] flex-col items-center justify-center gap-3 bg-[#FCFBFF] px-5">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p role="status" className="text-sm text-slate-500">
          Đang tải bộ từ vựng...
        </p>
      </main>
    );
  }

  // Không tìm thấy hoặc bộ thẻ chưa xuất bản.
  if (notFound) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16">
        <BookOpen className="h-10 w-10 text-violet-500" />

        <h1 className="mt-4 text-2xl font-bold">
          Không tìm thấy bộ từ vựng
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Bộ thẻ không tồn tại hoặc chưa được xuất bản.
        </p>

        <Link
          href="/flashcards"
          className="mt-5 inline-flex text-violet-600 underline"
        >
          Quay lại danh sách
        </Link>

      </main>

    );
  }

  // Lỗi kết nối API.
  if (error || !selectedSet) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="text-2xl font-bold">
          Không thể tải bộ từ vựng
        </h1>

        <p role="alert" className="mt-3 text-sm text-red-600">
          {error || "Đã xảy ra lỗi không xác định."}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>

          <Link
            href="/flashcards"
            className="rounded-xl border px-4 py-2.5 text-sm"
          >
            Quay lại danh sách
          </Link>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FCFBFF] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Quay lại trang danh sách
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-violet-100 hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách bộ thẻ
        </Link> */}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
              Học cùng Quizlet
            </p>

            <h1
              id="study-title"
              className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl"
            >
              {selectedSet.title}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {selectedSet.description}
            </p>
          </div>

          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            {selectedSet.level}
          </span>
        </div>

        {/* Hai cột có cùng chiều cao trên desktop */}
        <div className="mt-5 grid items-start gap-6 lg:items-stretch lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* ================================= */}
          {/* SIDEBAR CHẾ ĐỘ HỌC */}
          {/* ================================= */}

          <aside
            aria-label="Chế độ học"
            className="mt-6 flex flex-col self-start rounded-3xl border border-violet-100 bg-gradient-to-b from-[#F6F3FF] to-white p-4 shadow-sm lg:sticky lg:top-28"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <BookOpen className="h-5 w-5" />
              </span>

              <div>
                <h2 className="font-bold text-slate-900">
                  Chế độ học
                </h2>

                <p className="text-xs text-slate-500">
                  Luyện tập cùng Quizlet
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {studyModes.map((mode) => {
                const Icon = mode.icon;

                const available = availableModes.some(
                  (item) => item.id === mode.id,
                );

                const active =
                  available && effectiveMode === mode.id;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={!available}
                    aria-pressed={active}
                    onClick={() => {
                      if (available) {
                        setActiveMode(mode.id);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rrounded-2xl px-3 py-2 text-left transition ${active
                      ? "bg-violet-100 text-violet-700"
                      : available
                        ? "text-slate-700 hover:bg-violet-50"
                        : "cursor-not-allowed text-slate-400"
                      }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active
                        ? "bg-white text-violet-600"
                        : available
                          ? "bg-violet-50 text-violet-500"
                          : "bg-slate-100 text-slate-400"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {mode.label}
                      </span>

                      <span className="mt-0.5 block text-xs">
                        {mode.description}
                      </span>
                    </span>

                    {active ? (
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-violet-600"
                        aria-label="Đang sử dụng"
                      />
                    ) : !available ? (
                      <span className="text-[10px] font-medium">
                        Chưa có
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Thông tin bộ thẻ
            <div className="mt-6 border-t border-violet-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Bộ thẻ đang học
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-900">
                {selectedSet.title}
              </p>

              <span className="mt-3 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                {selectedSet.level}
              </span>
              
            </div> */}
            {/* Link mở Quizlet trực tiếp */}
            {quizletUrl && (
              <div className="border-t border-violet-300 mt-4 flex flex-wrap items-center justify-between gap-4  px-5 py-4">


                <a
                  href={quizletUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#5143EF] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4435DC]"
                >
                  Mở trên Quizlet
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </aside>

          {/* ================================= */}
          {/* KHUNG HỌC QUIZLET */}
          {/* ================================= */}

          <section
            aria-labelledby="study-title"
            className="min-w-0"
          >


            <div className="mt-5 overflow-hidden rounded-3xl border border-violet-100 bg-white p-2 shadow-sm sm:p-4">
              {embedUrl ? (
                <iframe
                  // Đổi key để tải lại iframe khi chuyển chế độ.
                  key={`${effectiveMode}-${embedUrl}`}
                  src={embedUrl}
                  title={`Quizlet — ${selectedSet.title} — ${effectiveMode}`}
                  allowFullScreen
                  loading="lazy"
                  className="block h-[75dvh] min-h-[540px] max-h-[820px] w-full rounded-2xl border-0"
                />
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl bg-[#F6F3FF] px-6 text-center">
                  <BookOpen className="h-12 w-12 text-violet-500" />

                  <h2 className="mt-4 font-bold text-slate-900">
                    Chưa có khung học khả dụng
                  </h2>

                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    Bộ thẻ này chưa có chế độ nhúng hợp lệ.
                    Vui lòng liên hệ quản trị viên hoặc mở
                    trực tiếp trên Quizlet.
                  </p>
                </div>
              )}
            </div>


          </section>
        </div>
      </div>
    </main>
  );
}

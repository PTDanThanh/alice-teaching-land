"use client";

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";

import { quizletSets } from "@/data/quizlet-sets";

type Language = "en" | "fr";

function validateQuizletUrl(
  value: string,
  requireEmbed = false,
): string | null {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.hostname !== "quizlet.com" ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    if (
      requireEmbed &&
      !url.pathname.replace(/\/$/, "").endsWith("/embed")
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export default function FlashcardWorkspace() {
  // Ưu tiên ngôn ngữ đã có dữ liệu.
  const [language, setLanguage] = useState<Language>(
    quizletSets.some((set) => set.language === "en") ? "en" : "fr",
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sets = quizletSets.filter(
    (set) => set.language === language,
  );

  const selectedSet =
    sets.find((set) => set.id === selectedId) ?? sets[0];

  const embedUrl = selectedSet
    ? validateQuizletUrl(selectedSet.embedUrl, true)
    : null;

  const quizletUrl = selectedSet
    ? validateQuizletUrl(selectedSet.quizletUrl)
    : null;

  function changeLanguage(value: Language) {
    setLanguage(value);
    setSelectedId(null);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <section className="bg-[#F6F3FF] px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-bold tracking-wide text-[#5143EF] sm:text-sm">
              HỌC TỪ VỰNG MỖI NGÀY
            </p>

            <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Học từ vựng theo cách{" "}
              <span className="text-[#5143EF]">của bạn</span>
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
              Khám phá các bộ từ vựng tiếng Anh, tiếng Pháp và
              luyện tập cùng Quizlet.
            </p>

            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              {[
                "Ôn tập mỗi ngày",
                "Linh hoạt thời gian",
                "Học theo nhịp của bạn",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-2">
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-5 w-5 text-[#9255FF]"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div
            aria-hidden="true"
            className="relative mx-auto hidden h-44 w-80 lg:block"
          >
            <div className="absolute left-2 top-5 h-32 w-40 -rotate-12 rounded-3xl bg-white/70" />

            <div className="absolute right-2 top-5 h-32 w-40 rotate-12 rounded-3xl bg-white/70" />

            <div className="absolute left-20 top-0 flex h-44 w-40 flex-col items-center justify-center rounded-3xl bg-white shadow-sm">
              <Sparkles className="h-8 w-8 text-[#9255FF]" />

              <span className="mt-3 text-xl font-bold text-[#5143EF]">
                Bonjour
              </span>

              <span className="mt-2 text-sm text-slate-400">
                Xin chào
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside
          aria-label="Chọn ngôn ngữ và bộ từ vựng"
          className="rounded-3xl bg-[#F6F3FF] p-5"
        >
          <h2 className="text-xl font-bold text-slate-900">
            Học cùng Quizlet
          </h2>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#E7DFF7] px-4 py-3 text-[#5143EF]">
            <Layers aria-hidden="true" className="h-5 w-5" />
            <span className="text-sm font-semibold">
              Khung luyện tập
            </span>
          </div>

          {/* Ngôn ngữ */}
          <div
            role="group"
            aria-label="Ngôn ngữ bộ thẻ"
            className="mt-6 grid grid-cols-2 gap-2"
          >
            {(
              [
                { value: "en", label: "Tiếng Anh" },
                { value: "fr", label: "Tiếng Pháp" },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={language === item.value}
                onClick={() => changeLanguage(item.value)}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${
                  language === item.value
                    ? "bg-[#5143EF] text-white"
                    : "bg-white text-slate-600 hover:bg-violet-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="my-6 border-t border-violet-200" />

          <h2 className="text-lg font-bold text-slate-900">
            Bộ từ vựng
          </h2>

          <div className="mt-4 space-y-3">
            {sets.map((set, index) => {
              const active = selectedSet?.id === set.id;

              return (
                <button
                  key={set.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(set.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${
                    active
                      ? "border-violet-200 bg-[#E7DFF7]"
                      : "border-transparent hover:bg-violet-100"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      active
                        ? "bg-[#5143EF] text-white"
                        : "bg-white text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {set.title}
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {set.description}
                    </span>

                    <span className="mt-2 inline-flex rounded-full bg-white px-2 py-0.5 text-xs text-[#5143EF]">
                      {set.level}
                    </span>
                  </span>

                  {active && (
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 text-[#5143EF]"
                    />
                  )}
                </button>
              );
            })}

            {sets.length === 0 && (
              <p className="text-sm leading-6 text-slate-500">
                Chưa có bộ từ vựng cho ngôn ngữ này.
              </p>
            )}
          </div>
        </aside>

        {/* Khung học */}
        <section
          aria-labelledby="selected-set-title"
          className="min-w-0"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="selected-set-title"
                className="text-xl font-bold text-slate-900 sm:text-2xl"
              >
                {selectedSet?.title ?? "Bộ thẻ đang được cập nhật"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {selectedSet?.description ??
                  "Hãy chọn ngôn ngữ khác để khám phá các bộ thẻ hiện có."}
              </p>
            </div>

            {selectedSet && (
              <span className="rounded-full bg-[#F6F3FF] px-3 py-1 text-xs font-semibold text-[#5143EF]">
                {selectedSet.level}
              </span>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-[#EAE3FF] bg-white p-2 sm:p-4">
            {embedUrl ? (
              <iframe
                key={embedUrl}
                src={embedUrl}
                title={`Quizlet — ${selectedSet?.title}`}
                allowFullScreen
                className="block h-[70vh] min-h-[500px] max-h-[750px] w-full rounded-2xl border-0"
              />
            ) : (
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-[#F6F3FF] px-6 text-center">
                <BookOpen
                  aria-hidden="true"
                  className="h-12 w-12 text-[#9255FF]"
                />

                <h3 className="mt-4 font-semibold text-slate-900">
                  {selectedSet
                    ? "Chưa có khung học khả dụng"
                    : "Chưa có bộ thẻ"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {selectedSet
                    ? "Bạn có thể mở bộ thẻ trên Quizlet bằng liên kết bên dưới."
                    : "Các bộ từ vựng sẽ được bổ sung sau."}
                </p>
              </div>
            )}
          </div>

          {quizletUrl && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-xs leading-6 text-slate-500">
                Nếu khung học yêu cầu xác minh hoặc không tải được,
                hãy mở bộ thẻ trực tiếp trên Quizlet.
              </p>

              <a
                href={quizletUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5143EF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4435DC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              >
                Mở trên Quizlet
                <ExternalLink
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              </a>
            </div>
          )}

          <p role="status" aria-atomic="true" className="sr-only">
            {selectedSet
              ? `Đang chọn ${selectedSet.title}`
              : "Chưa có bộ thẻ"}
          </p>
        </section>
      </div>
    </div>
  );
}
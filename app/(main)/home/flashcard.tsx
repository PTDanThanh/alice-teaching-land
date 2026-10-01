"use client";

import { useState } from "react";
import { BookOpen, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { quizletSets } from "@/data/quizlet-sets";

type Language = "fr" | "en";

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

export default function FlashcardSection() {
    const [language, setLanguage] = useState<Language>("fr");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const sets = quizletSets.filter(
        (item) => item.language === language,
    );

    const selectedSet =
        sets.find((item) => item.id === selectedId) ?? sets[0];

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
        <section
            aria-labelledby="flashcard-heading"
            className="bg-[#F6F3FF] px-4 py-8 sm:px-6 lg:py-10"
        >
            <div className="mx-auto max-w-7xl">
                {/* Tiêu đề */}
                <div className="text-center">
                    <span className="inline-flex rounded-full bg-[#EBE6FF] px-3 py-1 text-xs font-medium text-[#5143EF]">
                        HỌC VỚI FLASHCARD
                    </span>

                    <h2
                        id="flashcard-heading"
                        className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
                    >
                        Ghi Nhớ Từ Vựng Dễ Dàng
                    </h2>

                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                        Học từ vựng theo từng bộ thẻ và luyện tập cùng
                        các hoạt động trên Quizlet.
                    </p>

                    {/* Chọn ngôn ngữ */}
                    <div
                        role="group"
                        aria-label="Ngôn ngữ bộ thẻ"
                        className="mt-5 inline-flex gap-1 rounded-full border border-[#E5DFFF] bg-white p-1"
                    >
                        {(
                            [
                                { value: "fr", label: "Tiếng Pháp" },
                                { value: "en", label: "Tiếng Anh" },
                            ] as const
                        ).map((item) => (
                            <Button
                                key={item.value}
                                type="button"
                                variant="ghost"
                                aria-pressed={language === item.value}
                                onClick={() => changeLanguage(item.value)}
                                className={`rounded-full px-5 ${language === item.value
                                    ? "bg-[#5143EF] text-white hover:bg-[#4435DC] hover:text-white"
                                    : "text-slate-600 hover:bg-[#F6F3FF]"
                                    }`}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
                    {/* Khung học */}
                    <div className="min-w-0 rounded-2xl border border-[#EAE5F5] bg-white p-3 shadow-sm sm:p-4">
                        {selectedSet ? (
                            <>
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900">
                                            {selectedSet.title}
                                        </h3>

                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            {selectedSet.description}
                                        </p>
                                    </div>

                                    <span className="shrink-0 rounded-full bg-[#F0ECFF] px-2.5 py-1 text-xs font-medium text-[#5143EF]">
                                        {selectedSet.level}
                                    </span>
                                </div>

                                {embedUrl ? (
                                    <iframe
                                        key={embedUrl}
                                        src={embedUrl}
                                        title={`Quizlet — ${selectedSet.title}`}
                                        loading="lazy"
                                        allowFullScreen
                                        className="block h-[48vh] min-h-[650px] max-h-[700px] w-full rounded-xl border-0"
                                    />
                                ) : (
                                    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-[#F6F3FF] px-6 text-center">
                                        <BookOpen
                                            aria-hidden="true"
                                            className="h-10 w-10 text-[#5143EF]"
                                        />

                                        <p className="mt-4 text-sm leading-6 text-slate-500">
                                            Bộ thẻ chưa có khung học khả dụng.
                                        </p>
                                    </div>
                                )}

                                {quizletUrl && (
                                    <Button
                                        asChild
                                        className="mt-4 w-full rounded-lg bg-[#5143EF] text-white hover:bg-[#4435DC]"
                                    >
                                        <a
                                            href={quizletUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Mở trên Quizlet
                                            <ExternalLink
                                                aria-hidden="true"
                                                className="ml-2 h-4 w-4"
                                            />
                                        </a>
                                    </Button>
                                )}
                            </>
                        ) : (
                            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-[#F6F3FF] px-6 text-center">
                                <BookOpen
                                    aria-hidden="true"
                                    className="h-10 w-10 text-[#5143EF]"
                                />

                                <h3 className="mt-4 font-semibold text-slate-900">
                                    Bộ thẻ đang được cập nhật
                                </h3>

                                <p className="mt-2 text-sm text-slate-500">
                                    Chưa có bộ thẻ{" "}
                                    {language === "fr" ? "tiếng Pháp" : "tiếng Anh"}.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Danh sách bộ thẻ */}
                    <aside
                        aria-label="Danh sách bộ từ vựng"
                        className="w-full rounded-2xl border border-[#EAE5F5] bg-white p-4 shadow-sm"
                    >
                        <h3 className="font-semibold text-slate-900">
                            Chọn bộ từ vựng
                        </h3>

                        <div className="mt-4 space-y-3">
                            {sets.map((item, index) => {
                                const active = selectedSet?.id === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedId(item.id)}
                                        aria-pressed={active}
                                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5143EF] ${active
                                            ? "border-[#DDD7FF] bg-[#F6F3FF]"
                                            : "border-slate-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active
                                                ? "bg-[#5143EF] text-white"
                                                : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {index + 1}
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-slate-900">
                                                {item.title}
                                            </span>

                                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                                                {item.description}
                                            </span>

                                            <span className="mt-2 inline-flex rounded-full bg-[#EBE6FF] px-2 py-0.5 text-xs text-[#5143EF]">
                                                {item.level}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}

                            {sets.length === 0 && (
                                <p className="text-sm text-slate-500">
                                    Chưa có bộ từ vựng.
                                </p>
                            )}
                        </div>
                    </aside>
                </div>

                <p className="sr-only" role="status" aria-atomic="true">
                    {selectedSet
                        ? `Đang chọn ${selectedSet.title}`
                        : "Chưa có bộ thẻ"}
                </p>
            </div>
        </section>
    );
}
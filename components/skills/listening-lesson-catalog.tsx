"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BookOpenText, Headphones, Search, Video } from "lucide-react";
import type { DictationSegment } from "@/lib/skills/dictation";

export type PublishedListeningLesson = {
    id: string;
    title: string;
    language: "en" | "fr";
    videoId: string;
    segments: DictationSegment[];
};

type LanguageFilter = "all" | "en" | "fr";

export default function ListeningLessonCatalog({
    lessons,
    onSelect,
}: {
    lessons: PublishedListeningLesson[];
    onSelect: (lessonId: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [language, setLanguage] = useState<LanguageFilter>("all");

    const visibleLessons = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase();
        return lessons.filter(
            (lesson) =>
                (language === "all" || lesson.language === language) &&
                (!normalized || lesson.title.toLocaleLowerCase().includes(normalized)),
        );
    }, [lessons, language, query]);

    return (
        <section aria-labelledby="listening-catalog-title" className="space-y-7">


            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative block w-full sm:max-w-md">
                    <span className="sr-only">Tìm bài chép chính tả</span>
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Tìm kiếm tên bài học..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                </label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo ngôn ngữ">
                    {([
                        ["all", "Tất cả"],
                        ["en", "English"],
                        ["fr", "Français"],
                    ] as const).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={language === value}
                            onClick={() => setLanguage(value)}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-violet-500 ${language === value
                                ? "border-violet-600 bg-violet-700 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {visibleLessons.length ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleLessons.map((lesson) => (
                        <button
                            key={lesson.id}
                            type="button"
                            onClick={() => onSelect(lesson.id)}
                            className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                        >
                            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-slate-100">
                                {/******** YouTube thumbnail is a public image; video remains embedded only on detail. ********/}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`https://i.ytimg.com/vi/${encodeURIComponent(lesson.videoId)}/hqdefault.jpg`}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <span className="absolute bottom-3 right-3 rounded-lg bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-white">
                                    {lesson.segments.length} câu
                                </span>
                            </div>
                            <div className="space-y-4 p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                        {lesson.language === "fr" ? "Français" : "English"}
                                    </span>
                                    <Video className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                </div>
                                <h3 className="line-clamp-2 min-h-12 text-lg font-bold leading-6 text-slate-900 group-hover:text-violet-700">
                                    {lesson.title}
                                </h3>
                                <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                                    <span className="inline-flex items-center gap-2 text-slate-500">
                                        <BookOpenText className="h-4 w-4" aria-hidden="true" /> Dictation
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-semibold text-violet-700">
                                        Bắt đầu <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="px-6 py-16 text-center">
                    <BookOpenText className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
                    <p className="mt-4 font-semibold text-slate-800">Không tìm thấy bài học phù hợp</p>
                    <p className="mt-2 text-sm text-slate-500">Hãy thử từ khóa hoặc ngôn ngữ khác.</p>
                </div>
            )}
        </section>
    );
}

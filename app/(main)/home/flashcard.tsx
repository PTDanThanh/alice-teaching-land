
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    BookOpen,
    ExternalLink,
    Layers3,
} from "lucide-react";

import { Button } from "@/components/ui/button";

// Kiểu dữ liệu đồng bộ với API /api/flashcards
type Language = "fr" | "en";

type PublicFlashcardSet = {
    _id: string;
    slug: string;
    title: string;
    description: string;
    language: Language;
    level: string;
    status?: "draft" | "published";
};

export default function FlashcardSection() {
    // Giữ mặc định tiếng Pháp như giao diện cũ
    const [language, setLanguage] = useState<Language>("fr");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Dữ liệu thật từ MongoDB thông qua Public API
    const [rows, setRows] = useState<PublicFlashcardSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadFlashcards() {
            setLoading(true);
            setError("");

            try {
                // Sử dụng cùng API với trang /flashcards
                const response = await fetch("/api/flashcards", {
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(
                        `Không tải được danh sách bộ thẻ (${response.status}).`,
                    );
                }

                const data: unknown = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error("Dữ liệu API không hợp lệ.");
                }

                // Kiểm tra dữ liệu trước khi sử dụng
                const published = data.filter(
                    (item): item is PublicFlashcardSet => {
                        if (
                            typeof item !== "object" ||
                            item === null
                        ) {
                            return false;
                        }

                        const row = item as Record<string, unknown>;

                        return (
                            typeof row._id === "string" &&
                            typeof row.slug === "string" &&
                            typeof row.title === "string" &&
                            typeof row.description === "string" &&
                            typeof row.level === "string" &&
                            (row.language === "en" ||
                                row.language === "fr") &&
                            (row.status === undefined ||
                                row.status === "published")
                        );
                    },
                );

                if (!controller.signal.aborted) {
                    setRows(published);
                }
            } catch (err) {
                if (controller.signal.aborted) return;

                setError(
                    err instanceof Error
                        ? err.message
                        : "Không thể tải danh sách Flashcard.",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadFlashcards();

        return () => controller.abort();
    }, []);

    // Lọc bộ thẻ theo ngôn ngữ được chọn
    const sets = useMemo(
        () => rows.filter((item) => item.language === language),
        [rows, language],
    );

    // Nếu chưa chọn bộ nào thì lấy bộ đầu tiên
    const selectedSet =
        sets.find((item) => item._id === selectedId) ??
        sets[0] ??
        null;

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
                {/* Tiêu đề: giữ nguyên giao diện cũ */}
                <div className="text-center">
                    <span className=" mt-3 inline-flex rounded-full bg-[#EBE6FF] px-3 py-1 text-xs font-medium text-[#5143EF]">
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

                    {/* Bộ lọc ngôn ngữ */}
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

                {/* Trạng thái tải dữ liệu */}
                {loading && (
                    <p
                        role="status"
                        className="mt-6 text-center text-sm text-slate-500"
                    >
                        Đang tải danh sách Flashcard...
                    </p>
                )}

                {error && !loading && (
                    <p
                        role="alert"
                        className="mt-6 rounded-xl border border-red-200 bg-white p-4 text-center text-sm text-red-600"
                    >
                        {error}
                    </p>
                )}

                {/* Giữ bố cục hai cột như thiết kế cũ */}
                <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
                    {/* Cột trái: bộ Flashcard được chọn */}
                    <div className="min-w-0 rounded-2xl border border-[#EAE5F5] bg-white p-3 shadow-sm sm:p-4">
                        {selectedSet && !loading && !error ? (
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

                                    {/* Liên kết đến trang /flashcards */}
                                    <div className="mt-4 flex justify-end">
                                        <Link
                                            href="/flashcards"
                                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#5143EF] hover:underline"
                                        >
                                            Xem tất cả bộ từ vựng

                                            <ExternalLink
                                                aria-hidden="true"
                                                className="h-4 w-4"
                                            />
                                        </Link>
                                    </div>
                                </div>

                                {/* Xem trước bộ thẻ thực tế */}
                                <div className="flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#EEE9FF] via-[#F9F7FF] to-[#E8F0FF] px-6 py-10 text-center">
                                    <div className="relative mb-8 flex h-36 w-48 items-center justify-center">
                                        <div className="absolute h-28 w-36 -rotate-12 rounded-2xl bg-violet-200" />

                                        <div className="absolute h-28 w-36 rotate-12 rounded-2xl bg-white shadow-lg" />

                                        <div className="relative flex h-28 w-36 items-center justify-center rounded-2xl bg-white shadow-xl">
                                            <Layers3 className="h-14 w-14 text-[#5143EF]" />
                                        </div>
                                    </div>

                                    <h4 className="max-w-lg text-xl font-extrabold text-slate-900">
                                        {selectedSet.title}
                                    </h4>


                                    <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">
                                        {selectedSet.description}
                                    </p>

                                    <span className="mt-4 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#5143EF]">
                                        {selectedSet.language === "fr"
                                            ? "Tiếng Pháp"
                                            : "Tiếng Anh"}{" "}
                                        · {selectedSet.level}
                                    </span>

                                    {/* Mở bộ thẻ thật trên trang chi tiết */}
                                    <Button
                                        asChild
                                        className="mt-7 rounded-xl bg-[#5143EF] px-6 text-white hover:bg-[#4435DC]"
                                    >
                                        <Link
                                            href={`/flashcards/${encodeURIComponent(
                                                selectedSet.slug,
                                            )}`}
                                        >
                                            Bắt đầu học

                                            <ArrowRight
                                                aria-hidden="true"
                                                className="ml-2 h-4 w-4"
                                            />
                                        </Link>
                                    </Button>
                                </div>


                            </>
                        ) : (
                            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                                <BookOpen className="h-10 w-10 text-[#5143EF]" />

                                <h3 className="mt-4 font-semibold text-slate-900">
                                    {loading
                                        ? "Đang tải bộ từ vựng"
                                        : error
                                            ? "Không thể tải dữ liệu"
                                            : "Bộ thẻ đang được cập nhật"}
                                </h3>

                                <p className="mt-2 text-sm text-slate-500">
                                    {loading
                                        ? "Vui lòng đợi trong giây lát."
                                        : error ||
                                        `Chưa có bộ thẻ ${language === "fr"
                                            ? "tiếng Pháp"
                                            : "tiếng Anh"
                                        }.`}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Cột phải: danh sách bộ thẻ thật */}
                    <aside
                        aria-label="Danh sách bộ từ vựng"
                        className="w-full rounded-2xl  bg-white p-4 "
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-slate-900">
                                Chọn bộ từ vựng
                            </h3>

                            {/* {!loading && !error && (
                                <span className="rounded-full bg-[#EBE6FF] px-2.5 py-1 text-xs font-semibold text-[#5143EF]">
                                    {sets.length} bộ
                                </span>
                            )} */}
                        </div>

                        <div className="mt-4 max-h-[650px] space-y-3 overflow-y-auto pr-1">
                            {!loading &&
                                !error &&
                                sets.map((item, index) => {
                                    const active =
                                        selectedSet?._id === item._id;

                                    return (
                                        <button
                                            key={item._id}
                                            type="button"
                                            onClick={() => setSelectedId(item._id)}
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

                            {!loading && !error && sets.length === 0 && (
                                <p className="text-sm text-slate-500">
                                    Chưa có bộ từ vựng.
                                </p>
                            )}

                            {loading && (
                                <p className="text-sm text-slate-500">
                                    Đang tải...
                                </p>
                            )}
                        </div>
                    </aside>
                </div>

                {/* Hỗ trợ trình đọc màn hình */}
                <p
                    className="sr-only"
                    role="status"
                    aria-atomic="true"
                >
                    {selectedSet
                        ? `Đang chọn ${selectedSet.title}`
                        : "Chưa có bộ thẻ"}
                </p>
            </div>
        </section>
    );
}

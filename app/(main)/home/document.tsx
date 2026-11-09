
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    File,
    FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";

// Các trường cần sử dụng từ API /api/materials
type MaterialItem = {
    id?: string;
    language: "en" | "fr";
    type: string;
};

// Cấu hình giao diện, không chứa số lượng cố định
const documentGroups = [
    {
        id: "word",
        label: "WORD",
        description: "Giáo trình, bài tập và tài liệu tham khảo",
        badgeClassName: "bg-[#5143EF]",
        borderClassName: "border-[#DDD7FF]",
    },
    {
        id: "powerpoint",
        label: "PowerPoint",
        description: "Bài giảng trực quan và dễ theo dõi",
        badgeClassName: "bg-[#FF3864]",
        borderClassName: "border-[#FFD5E2]",
    },
    {
        id: "pdf",
        label: "PDF",
        description: "Tài liệu thuận tiện để đọc và ôn luyện",
        badgeClassName: "bg-[#F5A000]",
        borderClassName: "border-[#FFE3CE]",
    },
] as const;

const slides = [
    {
        language: "en",
        title: "Tài Liệu Học Tiếng Anh",
        description:
            "Tổng hợp tài liệu tiếng Anh hữu ích dưới nhiều định dạng như Word, PowerPoint và PDF, giúp bạn dễ dàng học tập và ôn luyện.",
    },
    {
        language: "fr",
        title: "Tài Liệu Học Tiếng Pháp",
        description:
            "Tổng hợp tài liệu tiếng Pháp hữu ích dưới nhiều định dạng như Word, PowerPoint và PDF, giúp bạn dễ dàng học tập và ôn luyện.",
    },
] as const;

export default function DocumentSection() {
    const [slideIndex, setSlideIndex] = useState(0);

    // Dữ liệu thực tế lấy từ trang Thư viện tài liệu
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadMaterials() {
            try {
                setLoading(true);
                setLoadError(null);

                // Dùng cùng API với trang /materials
                const response = await fetch("/api/materials", {
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error("Không thể tải danh sách tài liệu.");
                }

                const data: unknown = await response.json();

                // API hiện tại trả về mảng tài liệu trực tiếp
                if (!Array.isArray(data)) {
                    throw new Error("Dữ liệu tài liệu không hợp lệ.");
                }

                // Chỉ giữ những trường cần thiết
                const validMaterials: MaterialItem[] = data.filter(
                    (item): item is MaterialItem =>
                        typeof item === "object" &&
                        item !== null &&
                        ("language" in item) &&
                        (item.language === "en" || item.language === "fr") &&
                        ("type" in item) &&
                        typeof item.type === "string",
                );

                if (!controller.signal.aborted) {
                    setMaterials(validMaterials);
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error("[DocumentSection]", error);
                setLoadError("Không thể tải dữ liệu tài liệu.");
                setMaterials([]);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadMaterials();

        return () => controller.abort();
    }, []);

    // Tính số lượng tài liệu theo ngôn ngữ và định dạng
    const materialCounts = useMemo(() => {
        const counts: Record<string, number> = {};

        for (const material of materials) {
            const key = `${material.language}:${material.type}`;
            counts[key] = (counts[key] ?? 0) + 1;
        }

        return counts;
    }, [materials]);

    return (
        <section
            aria-label="Tài liệu học ngoại ngữ"
            className="bg-white px-4 py-12 sm:px-6 lg:py-16"
        >
            <div className="relative mx-auto max-w-6xl">
                {/* Nút chuyển sang slide trước */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={slideIndex === 0}
                    onClick={() =>
                        setSlideIndex((current) => Math.max(0, current - 1))
                    }
                    aria-label="Xem slide tài liệu trước"
                    className="absolute left-0 top-0 z-10 rounded-full text-[#5143EF] hover:bg-[#F6F3FF]"
                >
                    <ChevronLeft
                        className="h-6 w-6"
                        aria-hidden="true"
                    />
                </Button>

                {/* Nút chuyển sang slide tiếp theo */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={slideIndex === slides.length - 1}
                    onClick={() =>
                        setSlideIndex((current) =>
                            Math.min(slides.length - 1, current + 1),
                        )
                    }
                    aria-label="Xem slide tài liệu tiếp theo"
                    className="absolute right-0 top-0 z-10 rounded-full text-[#5143EF] hover:bg-[#F6F3FF]"
                >
                    <ChevronRight
                        className="h-6 w-6"
                        aria-hidden="true"
                    />
                </Button>

                {/* Giữ nguyên hiệu ứng trượt của giao diện cũ */}
                <div className="overflow-hidden">
                    <div
                        className="
  flex transform-gpu
  transition-transform duration-700
  ease-[cubic-bezier(0.22,1,0.36,1)]
  motion-reduce:transition-none
"
                        style={{
                            transform: `translateX(-${slideIndex * 100}%)`,
                        }}
                    >
                        {slides.map((slide, index) => {
                            const total = materials.filter(
                                (item) => item.language === slide.language,
                            ).length;

                            return (
                                <div
                                    key={slide.language}
                                    inert={slideIndex !== index}
                                    aria-hidden={slideIndex !== index}
                                    className="w-full min-w-0 shrink-0"
                                >
                                    {/* Tiêu đề slide */}
                                    <div className="text-center">
                                        <h2 className="px-12 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                            {slide.title}
                                        </h2>

                                        <p className="mx-auto mt-3 max-w-4xl text-sm leading-6 text-slate-500 sm:text-base">
                                            {slide.description}
                                        </p>

                                        {/* {!loading && !loadError && (
                                            <p className="mt-3 text-sm font-medium text-[#5143EF]">
                                                Hiện có {total} tài liệu
                                            </p>
                                        )} */}
                                    </div>

                                    {/* Ba nhóm tài liệu */}
                                    <div className="mt-10 grid grid-cols-1 gap-5 md:mt-14 md:grid-cols-3">
                                        {documentGroups.map((group, groupIndex) => {
                                            // Số lượng thực tế theo ngôn ngữ + loại
                                            const count =
                                                materialCounts[
                                                `${slide.language}:${group.id}`
                                                ] ?? 0;

                                            return (
                                                <article
                                                    key={`${slide.language}-${group.id}-${slideIndex}`}
                                                    className={`
    document-card-enter
    group flex flex-col
    rounded-2xl border bg-[#F6F3FF] p-5 sm:p-6

    transition-all duration-300 ease-out
    hover:-translate-y-2
    hover:border-violet-400
    hover:shadow-xl hover:shadow-violet-200/40

    ${group.borderClassName}
  `}
                                                    style={{
                                                        animationDelay: `${groupIndex * 100}ms`,
                                                    }}
                                                >

                                                    <div className="flex items-start justify-between gap-4">
                                                        <span
                                                            className={`inline-flex rounded-md px-3 py-1 text-xs font-bold text-white ${group.badgeClassName}`}
                                                        >
                                                            {group.label}
                                                        </span>

                                                        <File
                                                            aria-hidden="true"
                                                            strokeWidth={1.5}
                                                            className="h-9 w-9 shrink-0 text-black"
                                                        />
                                                    </div>

                                                    <p className="mt-3 text-sm leading-6 text-slate-600">
                                                        {group.description}
                                                    </p>

                                                    {/* Số lượng từ MongoDB */}
                                                    <div className="mt-3">
                                                        <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600 shadow-sm">
                                                            <FileText
                                                                aria-hidden="true"
                                                                className="h-4 w-4 text-slate-900"
                                                            />
                                                            {loading ? (
                                                                <span
                                                                    aria-label="Đang tải số lượng tài liệu"
                                                                    className="inline-block h-3 w-16 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
                                                                />
                                                            ) : loadError ? (
                                                                "Chưa tải được"
                                                            ) : (
                                                                `${count} tài liệu`
                                                            )}
                                                        </span>
                                                    </div>

                                                    {/* Điều hướng đến đúng trang tài liệu */}
                                                    <div className="mt-auto pt-6">
                                                        <Button
                                                            asChild
                                                            className="mx-auto flex h-9 w-full max-w-60 rounded-lg bg-[#5143EF] text-white hover:bg-[#4435DC]"
                                                        >
                                                            <Link
                                                                href={`/materials?type=${group.id}&language=${slide.language}`}
                                                                aria-label={`Xem ${group.label} — ${slide.title}`}
                                                            >
                                                                Xem Tài Liệu

                                                                <ArrowRight
                                                                    aria-hidden="true"
                                                                    className="ml-2 h-5 w-5"
                                                                />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Thông báo lỗi nếu API không hoạt động */}
                {loadError && (
                    <p
                        role="alert"
                        className="mt-5 text-center text-sm text-red-600"
                    >
                        {loadError}
                    </p>
                )}

                {/* Thông báo slide hiện tại cho trình đọc màn hình */}
                <p
                    className="sr-only"
                    role="status"
                    aria-atomic="true"
                >
                    {slides[slideIndex].title}
                </p>
            </div>
        </section>
    );
}


"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
    materialFormats,
    type Material,
} from "@/data/materials";

interface RelatedMaterialsCarouselProps {
    materials: Material[];
}

export default function RelatedMaterialsCarousel({
    materials,
}: RelatedMaterialsCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);

    // Kiểm tra vị trí cuộn để bật/tắt hai nút
    const updateButtons = () => {
        const el = scrollRef.current;
        if (!el) return;

        setCanPrev(el.scrollLeft > 2);

        setCanNext(
            el.scrollLeft + el.clientWidth < el.scrollWidth - 2
        );
    };

    // Cập nhật khi màn hình thay đổi kích thước
    // hoặc danh sách tài liệu thay đổi
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const observer = new ResizeObserver(updateButtons);
        observer.observe(el);

        // Theo dõi chiều rộng danh sách tài liệu
        const content = el.firstElementChild;
        if (content) observer.observe(content);

        updateButtons();

        return () => observer.disconnect();
    }, [materials]);

    // Cuộn sang trái hoặc phải một thẻ
    const scroll = (direction: "prev" | "next") => {
        const el = scrollRef.current;
        if (!el) return;

        const card = el.firstElementChild as HTMLElement | null;
        if (!card) return;

        const gap =
            parseFloat(getComputedStyle(el).columnGap) || 0;

        const distance = card.getBoundingClientRect().width + gap;

        el.scrollBy({
            left: direction === "next" ? distance : -distance,
            behavior: "smooth",
        });
    };

    if (materials.length === 0) return null;

    return (
        <section
            aria-labelledby="related-materials-title"
            className="mt-10 sm:mt-12"
        >
            {/* Tiêu đề */}
            <h2
                id="related-materials-title"
                className="text-lg font-bold text-slate-900 sm:text-xl"
            >
                Những tài liệu khác bạn có thể quan tâm
            </h2>

            {/* Carousel và hai nút điều hướng */}
            <div className="relative mt-5">

                {/* Nút chuyển sang trái */}
                <button
                    type="button"
                    onClick={() => scroll("prev")}
                    disabled={!canPrev}
                    aria-label="Tài liệu trước"
                    className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-violet-200 bg-white text-[#5143EF] shadow-md transition-all hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                {/* Danh sách tài liệu - chỉ có một danh sách */}
                <div
                    ref={scrollRef}
                    onScroll={updateButtons}
                    className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {materials.map((item) => (
                        <Link
                            key={item.id}
                            href={`/materials/${encodeURIComponent(item.id)}`}
                            className="group flex min-w-0 shrink-0 basis-full snap-start flex-col rounded-2xl border border-[#EAE3FF] bg-[#F6F3FF] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-[#EEE8FF] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)]"
                        >
                            {/* Định dạng và trình độ */}
                            <span className="text-xs font-semibold text-[#5143EF]">
                                {materialFormats[item.type].label} · {item.level}
                            </span>

                            {/* Tên tài liệu */}
                            <h3 className="mt-2 break-words text-base font-bold text-slate-900">
                                {item.title}
                            </h3>

                            {/* Mô tả */}
                            <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-500">
                                {item.description}
                            </p>

                            {/* Link mở tài liệu */}
                            <span className="mt-auto flex items-center gap-2 pt-4 text-sm font-semibold text-[#5143EF]">
                                Mở tài liệu
                                <ArrowRight
                                    aria-hidden="true"
                                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                                />
                            </span>
                        </Link>
                    ))}
                </div>

                {/* Nút chuyển sang phải */}
                <button
                    type="button"
                    onClick={() => scroll("next")}
                    disabled={!canNext}
                    aria-label="Tài liệu tiếp theo"
                    className="absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-1/3 -translate-y-1/2 items-center justify-center rounded-full border border-violet-200 bg-white text-[#5143EF] shadow-md transition-all hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
                >
                    <ArrowRight className="h-5 w-5" />
                </button>
            </div>
        </section>
    );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    File,
    FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const documentGroupsFranch = [
    {
        id: "word",
        label: "WORD",
        description: "Giáo trình, bài tập và tài liệu tham khảo",
        count: 24,
        badgeClassName: "bg-[#5143EF]",
        borderClassName: "border-[#DDD7FF]",
        href: "/documents?type=word",
    },
    {
        id: "powerpoint",
        label: "PowerPoint",
        description: "Bài giảng trực quan và dễ theo dõi",
        count: 24,
        badgeClassName: "bg-[#FF3864]",
        borderClassName: "border-[#FFD5E2]",
        href: "/documents?type=powerpoint",
    },
    {
        id: "pdf",
        label: "PDF",
        description: "Tài liệu thuận tiện để đọc và ôn luyện",
        count: 24,
        badgeClassName: "bg-[#F5A000]",
        borderClassName: "border-[#FFE3CE]",
        href: "/documents?type=pdf",
    },
];

const doccumentEnglish = [
    {
        id: "word",
        label: "WORD",
        description: "Giáo trình, bài tập tiếng Anh",
        count: 24,
        badgeClassName: "bg-[#5143EF]",
        borderClassName: "border-[#DDD7FF]",
        href: "/documents?type=word",
    },
    {
        id: "powerpoint",
        label: "PowerPoint",
        description: "Bài giảng chuyên ngành tiếng Anh",
        count: 24,
        badgeClassName: "bg-[#FF3864]",
        borderClassName: "border-[#FFD5E2]",
        href: "/documents?type=powerpoint",
    },
    {
        id: "pdf",
        label: "PDF",
        description: "Tài liệu ôn tiếng Anh",
        count: 24,
        badgeClassName: "bg-[#F5A000]",
        borderClassName: "border-[#FFE3CE]",
        href: "/documents?type=pdf",
    },
]

export default function DocumentSection() {
    const [slideIndex, setSlideIndex] = useState(0); //chia ra hai slide khác nhau 

    const slides = [
        {
            language: "en",
            title: "Tài Liệu Học Tiếng Anh",
            description:
                "Tổng hợp tài liệu tiếng Anh hữu ích dưới nhiều định dạng như Word, PowerPoint và PDF, giúp bạn dễ dàng học tập và ôn luyện.",
            groups: doccumentEnglish,
        },
        {
            language: "fr",
            title: "Tài Liệu Học Tiếng Pháp",
            description:
                "Tổng hợp tài liệu tiếng Pháp hữu ích dưới nhiều định dạng như Word, PowerPoint và PDF, giúp bạn dễ dàng học tập và ôn luyện.",
            groups: documentGroupsFranch,
        },

    ];

    return (
        <section
            aria-label="Tài liệu học ngoại ngữ"
            className="bg-white px-4 py-12 sm:px-6 lg:py-16"
        >
            <div className="relative mx-auto max-w-6xl">
                {/* Mũi tên cố định, nội dung trượt bên dưới */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={slideIndex === 0}
                    onClick={() => setSlideIndex(0)}
                    aria-label="Xem tài liệu tiếng Pháp"
                    className="absolute left-0 top-0 z-10 rounded-full text-[#5143EF] hover:bg-[#F6F3FF]"
                >
                    <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={slideIndex === slides.length - 1}
                    onClick={() => setSlideIndex(1)}
                    aria-label="Xem tài liệu tiếng Anh"
                    className="absolute right-0 top-0 z-10 rounded-full text-[#5143EF] hover:bg-[#F6F3FF]"
                >
                    <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </Button>

                <div className="overflow-hidden">
                    <div
                        className="flex transition-transform duration-500 ease-in-out motion-reduce:transition-none"
                        style={{
                            transform: `translateX(-${slideIndex * 100}%)`, //hiệu ứng trược
                        }}
                    >
                        {slides.map((slide, index) => (
                            <div
                                key={slide.language}
                                inert={slideIndex !== index}
                                aria-hidden={slideIndex !== index}
                                className="w-full min-w-0 shrink-0"
                            >
                                <div className="text-center">
                                    <h2 className="px-12 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                        {slide.title}
                                    </h2>

                                    <p className="mx-auto mt-3 max-w-4xl text-sm leading-6 text-slate-500 sm:text-base">
                                        {slide.description}
                                    </p>
                                </div>

                                <div className="mt-10 grid grid-cols-1 gap-5 md:mt-14 md:grid-cols-3">
                                    {slide.groups.map((group) => (
                                        <article
                                            key={group.id}
                                            className={`flex flex-col rounded-2xl border bg-[#F6F3FF] p-5 sm:p-6 ${group.borderClassName}`}
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

                                            <div className="mt-3">
                                                <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600 shadow-sm">
                                                    <FileText
                                                        aria-hidden="true"
                                                        className="h-4 w-4 text-slate-900"
                                                    />
                                                    {group.count} tài liệu
                                                </span>
                                            </div>

                                            <div className="mt-auto pt-6">
                                                <Button
                                                    asChild
                                                    className="mx-auto flex h-9 w-full max-w-60 rounded-lg bg-[#5143EF] text-white hover:bg-[#4435DC]"
                                                >
                                                    <Link
                                                        href={`${group.href}&language=${slide.language}`}
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
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="sr-only" role="status" aria-atomic="true">
                    {slides[slideIndex].title}
                </p>
            </div>
        </section>
    );
}
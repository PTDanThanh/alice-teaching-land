import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    BookOpen,
    GraduationCap,
    Layers,
} from "lucide-react";
import { Sparkles } from "lucide-react";

import TimelineSection from "@/components/ui/timeline";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: "Giới thiệu | Alice In Teachingland",
    description:
        "Khám phá Alice In Teachingland — không gian học tiếng Pháp và tiếng Anh qua tài liệu, flashcard và những bài học gần gũi.",
};

// Thay null bằng "/images/alice.jpg" khi đã có ảnh trong public/images.
const portraitSrc: string | null = null;

const journeys = [
    {
        id: "french",
        title: "Khám phá tiếng Pháp",
        description:
            "Làm quen với tiếng Pháp qua những chủ đề gần gũi, từ phát âm và từ vựng đến các mẫu câu thường dùng.",
        items: [
            "Phát âm và từ vựng cơ bản",
            "Ngữ pháp theo từng chủ đề",
            "Tài liệu luyện tập và ôn tập",
        ],
        icon: BookOpen,
        href: "/documents?language=fr",
        action: "Xem tài liệu tiếng Pháp",
    },
    {
        id: "english",
        title: "Chinh phục tiếng Anh",
        description:
            "Xây dựng nền tảng tiếng Anh và luyện tập theo mục tiêu của bạn, từ giao tiếp hằng ngày đến ôn tập TOEIC.",
        items: [
            "Từ vựng theo tình huống",
            "Kiến thức và bài tập ngữ pháp",
            "Nội dung hỗ trợ ôn tập TOEIC",
        ],
        icon: GraduationCap,
        href: "/documents?language=en",
        action: "Xem tài liệu tiếng Anh",
    },
    {
        id: "flashcards",
        title: "Ghi nhớ cùng flashcard",
        description:
            "Ôn tập từng bộ từ vựng qua các hoạt động học trên Quizlet và tạo thói quen luyện tập mỗi ngày.",
        items: [
            "Bộ thẻ theo từng chủ đề",
            "Ôn tập linh hoạt theo nhu cầu",
            "Kết hợp học và thực hành",
        ],
        icon: Layers,
        href: "/home#flashcards",
        action: "Khám phá flashcard",
    },
];

export default function AboutPage() {
    return (
        <div className="bg-white">
            {/* PHẦN 1: Giới thiệu và ảnh chân dung */}
            <section
                aria-labelledby="about-title"
                className="bg-[#F6F3FF] px-4 py-12 sm:px-6 lg:py-16"
            >
                <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-[minmax(0,1fr)_280px] lg:gap-20">
                    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
                        <span className="inline-flex rounded-full bg-[#F6F3FF] px-3 py-1 text-xs font-semibold text-[#5143EF]">
                            BIENVENUE CHEZ ALICE
                        </span>

                        <h1
                            id="about-title"
                            className="mt-4 text-3xl font-extrabold whitespace-nowrap text-slate-900 sm:text-4xl"
                        >
                            Một góc học ngoại ngữ
                            <span className="ml-2 mt-2  text-[#4943ef]">
                                cùng Alice !
                            </span>
                        </h1>

                        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
                            <p className="flex items-start gap-3">
                                <Sparkles
                                    aria-hidden="true"
                                    className="mt-1 h-5 w-5 shrink-0 text-[#9255FF]"
                                />
                                <span>
                                    Alice In Teachingland là không gian dành cho những ai
                                    muốn khám phá tiếng Pháp và tiếng Anh qua những
                                    bài học gần gũi, dễ tiếp cận.
                                </span>
                            </p>

                            <p className="flex items-start gap-3">
                                <Sparkles
                                    aria-hidden="true"
                                    className="mt-1 h-5 w-5 shrink-0 text-[#9255FF]"
                                />
                                <span>
                                    Từ tài liệu học tập đến các bộ flashcard, mỗi nội
                                    dung đều hướng đến việc giúp bạn xây dựng kiến
                                    thức từng bước và duy trì niềm vui khi học.
                                </span>
                            </p>

                            <p className="flex items-start gap-3">
                                <Sparkles
                                    aria-hidden="true"
                                    className="mt-1 h-5 w-5 shrink-0 text-[#9255FF]"
                                />
                                <span>
                                    Hãy bắt đầu từ một từ mới, một bài học nhỏ và
                                    cùng Alice tiến bộ mỗi ngày.
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-2xl bg-white shadow-sm">
                        {portraitSrc ? (
                            <Image
                                src={portraitSrc}
                                alt="Chân dung Alice"
                                fill
                                sizes="280px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-white to-[#E9E2FF]">
                                <span
                                    aria-hidden="true"
                                    className="flex h-24 w-24 items-center justify-center rounded-full bg-[#5143EF]/10 text-5xl font-bold text-[#5143EF]"
                                >
                                    A
                                </span>

                                <p className="mt-5 text-2xl font-bold text-slate-900">
                                    Alice
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                    Alice In Teachingland
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* PHẦN 2: Timeline từ component riêng */}
            <TimelineSection />

            {/* PHẦN 3: Hành trình học tập */}
            <section
                aria-labelledby="learning-journey-title"
                className="px-4 pb-14 pt-2 sm:px-6 lg:pb-20"
            >
                <div className="mx-auto max-w-6xl">
                    <h2
                        id="learning-journey-title"
                        className="mx-auto max-w-xl rounded-2xl bg-[#F6F3FF] px-5 py-3 text-center text-2xl font-extrabold text-slate-900 sm:text-3xl"
                    >
                        Hành Trình Học Tập
                    </h2>

                    <div className="mt-8 grid gap-6 md:grid-cols-3">
                        {journeys.map((journey) => {
                            const Icon = journey.icon;

                            return (
                                <article
                                    key={journey.id}
                                    className="flex flex-col rounded-2xl border border-[#EAE3FF] bg-[#F6F3FF] p-6 sm:p-7"
                                >
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#5143EF]">
                                        <Icon
                                            aria-hidden="true"
                                            className="h-7 w-7"
                                            strokeWidth={1.75}
                                        />
                                    </div>

                                    <h3 className="mt-6 text-xl font-bold text-slate-900">
                                        {journey.title}
                                    </h3>

                                    <p className="mt-3 text-sm leading-7 text-slate-600">
                                        {journey.description}
                                    </p>

                                    <ul className="mt-5 space-y-3">
                                        {journey.items.map((item) => (
                                            <li
                                                key={item}
                                                className="flex items-start gap-3 text-sm leading-6 text-slate-600"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#9255FF]"
                                                />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* <div className="mt-auto pt-8">
                                        <Button
                                            asChild
                                            className="h-auto min-h-10 w-full whitespace-normal rounded-xl bg-[#5143EF] px-4 py-3 text-white hover:bg-[#4435DC]"
                                        >
                                            <Link href={journey.href}>
                                                {journey.action}
                                                <ArrowRight
                                                    aria-hidden="true"
                                                    className="h-4 w-4 shrink-0"
                                                />
                                            </Link>
                                        </Button>
                                    </div> */}
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HeroContent } from "@/schema/home-content.schema";

type HeroProps = {
    content: HeroContent;
};

export default function Hero({ content }: HeroProps) {
    if (!content.enabled) return null;

    return (
        <section
            aria-labelledby="hero-title"
            className="bg-[#F5F2FF]"
        >
            <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-10 md:grid-cols-2 md:gap-10 lg:px-8 lg:py-12">
                {/* Nội dung */}
                <div>
                    <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] sm:text-xs">
                        <span className="font-semibold text-rose-500">
                            {content.greeting}
                        </span>

                        <span
                            aria-hidden="true"
                            className="h-3 w-px bg-slate-200"
                        />

                        <span className="text-slate-600">
                            {content.tagline}
                        </span>
                    </div>

                    <h1
                        id="hero-title"
                        className="mt-5 whitespace-pre-line font-serif text-4xl font-bold leading-[1.1] tracking-tight text-[#111827] sm:text-5xl lg:text-6xl"
                    >
                        {content.title}
                    </h1>

                    <p className="mt-4 max-w-lg whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">
                        {content.description}
                    </p>

                    <Button
                        asChild
                        className="mt-5 h-11 rounded-lg bg-[#5143EF] px-5 font-semibold text-white shadow-md shadow-indigo-200 hover:bg-[#4334DB]"
                    >
                        <Link href={content.buttonHref}>
                            {content.buttonLabel}

                            <ArrowRight
                                aria-hidden="true"
                                className="ml-1 h-4 w-4"
                            />
                        </Link>
                    </Button>
                </div>

                {/* Ảnh minh họa */}
                <div className="relative aspect-[1.54/1] w-full overflow-hidden rounded-[22px]">
                    <Image
                        src={content.imageUrl}
                        alt={content.imageAlt}
                        fill
                        priority
                        sizes="(max-width: 767px) 100vw, (max-width: 1280px) 50vw, 600px"
                        className="object-cover"
                    />
                </div>
            </div>
        </section>
    );
}
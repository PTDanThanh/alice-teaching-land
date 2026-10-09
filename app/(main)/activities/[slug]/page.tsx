import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";

import {
    activityCategoryLabels,
    formatActivityDate,
    getActivityBySlug,
} from "@/data/activities";

interface ActivityDetailPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({
    params,
}: ActivityDetailPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = getActivityBySlug(slug);

    return {
        title: post
            ? `${post.title} | Alice In Teachingland`
            : "Không tìm thấy bài viết | Alice In Teachingland",
        description: post?.excerpt,
    };
}

export default async function ActivityDetailPage({
    params,
}: ActivityDetailPageProps) {
    const { slug } = await params;
    const post = getActivityBySlug(slug);

    if (!post) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-white">
            <section className="bg-[#F6F3FF] px-4 py-10 sm:px-6">
                <div className="mx-auto max-w-full justify-between gap-8 sm:max-w-6xl">
                    <Link
                        href="/activities"
                        className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#5143EF] hover:underline focus-visible:outline-2 focus-visible:outline-violet-500"
                    >
                        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                        Quay về trang hoạt động
                    </Link>

                    <div className="mt-6">
                        <span className="inline-flex rounded-full bg-[#E0D2F7] px-4 py-1 text-xs font-semibold text-[#5143EF]">
                            {activityCategoryLabels[post.category]}
                        </span>
                    </div>

                    <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
                        {post.title}
                    </h1>

                    <p className="mt-5 text-base leading-7 text-slate-600">
                        {post.excerpt}
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                        <CalendarDays aria-hidden="true" className="h-4 w-4" />
                        <span>
                            Cập nhật:{" "}
                            <time dateTime={post.updatedAt}>
                                {formatActivityDate(post.updatedAt)}
                            </time>
                        </span>
                    </div>
                </div>
            </section>

            <article
                aria-label="Nội dung bài viết"
                className="mx-auto max-w-7xl px-4 py-10 sm:px-6"
            >
                {post.image && (
                    <div className="relative mb-8 aspect-[2/1] overflow-hidden rounded-2xl">
                        <Image
                            src={post.image}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 768px"
                            className="object-cover"
                        />
                    </div>
                )}

                <div className="space-y-8">
                    {post.content.map((section) => (
                        <section key={section.heading}>
                            <h2 className="text-xl font-bold text-slate-900">
                                {section.heading}
                            </h2>

                            <p className="mt-3 text-base leading-8 text-slate-600">
                                {section.text}
                            </p>
                        </section>
                    ))}
                </div>

                <div className="mt-10 border-t border-slate-200 pt-6">
                    <Link
                        href="/activities"
                        className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#5143EF] hover:underline focus-visible:outline-2 focus-visible:outline-violet-500"
                    >
                        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                        Xem các bài viết khác
                    </Link>
                </div>
            </article>
        </div>
    );
}
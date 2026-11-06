import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    BookOpen,
} from "lucide-react";

import {
    activityCategoryLabels,
    formatActivityDate,
} from "@/data/activities";
import {
    getPublicActivityBySlug,
    getPublicActivityPosts,
} from "@/lib/activities/public";

import { cleanActivityHtml } from "@/lib/activities/validation";

interface ActivityDetailPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({
    params,
}: ActivityDetailPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPublicActivityBySlug(slug);

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
    const post = await getPublicActivityBySlug(slug);

    if (!post) {
        notFound();
    }

    // Lấy danh sách bài viết đã xuất bản.
    // Cần có hàm getPublicActivities() trong lib/activities/public.ts
    // Lấy danh sách bài viết công khai từ MongoDB và dữ liệu mẫu
    const allPosts = await getPublicActivityPosts();

    // Loại bỏ bài viết đang xem
    const relatedPosts = allPosts.filter(
        (item) => item.slug !== post.slug,
    );

    // Xác định vị trí bài viết hiện tại
    const currentIndex = allPosts.findIndex(
        (item) => item.slug === post.slug,
    );

    // Lấy bài trước và bài tiếp theo
    const previousPost =
        currentIndex >= 0 && allPosts.length > 1
            ? allPosts[
            (currentIndex - 1 + allPosts.length) % allPosts.length
            ]
            : null;

    const nextPost =
        currentIndex >= 0 && allPosts.length > 1
            ? allPosts[(currentIndex + 1) % allPosts.length]
            : null;

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

                {/* HTML từ Tiptap phải được làm sạch ở server trước khi render. */}
                {post.contentHtml?.trim() ? (
                    <div
                        className="activity-rich-text max-w-none text-slate-700"
                        dangerouslySetInnerHTML={{ __html: cleanActivityHtml(post.contentHtml) }}
                    />
                ) : (
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

                )}


                {/* Bài viết khác */}
                <section className="mt-12 border-t border-slate-200 pt-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Bài viết khác
                        </h2>

                        {/* Hai nút chuyển bài trước / tiếp theo */}
                        {previousPost && nextPost && (
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/activities/${previousPost.slug}`}
                                    aria-label="Bài viết trước"
                                    title="Bài viết trước"
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-[#5143EF] hover:text-[#5143EF]"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Link>

                                <Link
                                    href={`/activities/${nextPost.slug}`}
                                    aria-label="Bài viết tiếp theo"
                                    title="Bài viết tiếp theo"
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-[#5143EF] hover:text-[#5143EF]"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Danh sách bài viết gợi ý */}
                    {relatedPosts.length > 0 ? (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {relatedPosts.slice(0, 3).map((item) => (
                                <Link
                                    key={item.slug}
                                    href={`/activities/${item.slug}`}
                                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
                                >
                                    {/* Ảnh bài viết */}
                                    <div className="relative aspect-[16/10] overflow-hidden bg-violet-50">
                                        {item.image ? (
                                            <Image
                                                src={item.image}
                                                alt={item.title}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                className="object-cover transition duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <BookOpen className="h-10 w-10 text-violet-300" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Thông tin bài viết */}
                                    <div className="p-4">
                                        <span className="text-xs font-semibold text-[#5143EF]">
                                            {activityCategoryLabels[item.category]}
                                        </span>

                                        <h3 className="mt-2 line-clamp-2 text-base font-bold text-slate-900 group-hover:text-[#5143EF]">
                                            {item.title}
                                        </h3>

                                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                                            {item.excerpt}
                                        </p>

                                        <span className="mt-4 inline-block text-sm font-semibold text-[#5143EF]">
                                            Xem chi tiết
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">
                            Chưa có bài viết khác.
                        </p>
                    )}
                </section>

            </article>
        </div>
    );
}
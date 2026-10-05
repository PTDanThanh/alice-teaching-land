"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Sparkles,
} from "lucide-react";

import {
  activityPosts,
  activityCategoryLabels,
  featuredActivitySlug,
  formatActivityDate,
  getActivityBySlug,
  type ActivityCategory,
  type ActivityPost,
} from "@/data/activities";

type CategoryFilter = ActivityCategory | "all";

const filters: {
  id: CategoryFilter;
  label: string;
}[] = [
  { id: "all", label: "Tất cả" },
  { id: "learning", label: "Góc học tập" },
  { id: "sharing", label: "Chia sẻ" },
];

function PostCover({
  post,
  featured = false,
}: {
  post: ActivityPost;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#F0ECF7] ${
        featured ? "aspect-[2/1]" : "aspect-[2/1]"
      }`}
    >
      {post.image ? (
        <Image
          src={post.image}
          alt=""
          fill
          sizes={
            featured
              ? "(max-width: 768px) 100vw, 60vw"
              : "(max-width: 768px) 100vw, 50vw"
          }
          className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#F6F3FF] to-[#DDD2F5]">
          <BookOpen
            aria-hidden="true"
            className="h-14 w-14 text-[#9255FF]/40 sm:h-20 sm:w-20"
            strokeWidth={1}
          />
        </div>
      )}

      {!featured && (
        <span className="absolute bottom-4 left-4 rounded-full bg-[#E0D2F7] px-4 py-1 text-xs font-semibold text-[#5143EF]">
          {activityCategoryLabels[post.category]}
        </span>
      )}
    </div>
  );
}

export default function ActivityFeed() {
  const [category, setCategory] = useState<CategoryFilter>("all");

  const featuredPost = getActivityBySlug(featuredActivitySlug);

  const visiblePosts = activityPosts
    .filter(
      (post) =>
        post.slug !== featuredActivitySlug &&
        (category === "all" || post.category === category),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <section
        aria-labelledby="activities-title"
        className="bg-[#F6F3FF] px-4 py-10 sm:px-6"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold text-[#9255FF]">
              GÓC HOẠT ĐỘNG
            </p>

            <h1
              id="activities-title"
              className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
            >
              Cùng học, cùng khám phá
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Cập nhật những hoạt động, câu chuyện và mẹo học
              ngoại ngữ từ Alice In Teachingland.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="hidden h-36 w-36 shrink-0 rotate-6 items-center justify-center rounded-3xl bg-white sm:flex"
          >
            <Sparkles
              className="h-16 w-16 text-[#9255FF]"
              strokeWidth={1.25}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Bài viết nổi bật */}
        {featuredPost && (
          <section
            aria-labelledby="featured-activity-title"
            className="grid items-center gap-7 md:grid-cols-[1.4fr_1fr] lg:gap-10"
          >
            <Link
              href={`/activities/${featuredPost.slug}`}
              aria-label={`Đọc bài viết: ${featuredPost.title}`}
              className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500"
            >
              <PostCover post={featuredPost} featured />
            </Link>

            <div>
              <span className="inline-flex rounded-full bg-[#D9C7FF] px-4 py-1 text-xs font-semibold text-[#7B42E5]">
                Hoạt động nổi bật
              </span>

              <h2
                id="featured-activity-title"
                className="mt-4 text-2xl font-bold leading-tight text-slate-900"
              >
                {featuredPost.title}
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                {featuredPost.excerpt}
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays
                  aria-hidden="true"
                  className="h-4 w-4 text-slate-900"
                />

                <span>
                  Cập nhật:{" "}
                  <time dateTime={featuredPost.updatedAt}>
                    {formatActivityDate(featuredPost.updatedAt)}
                  </time>
                </span>
              </div>

              <Link
                href={`/activities/${featuredPost.slug}`}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#5143EF] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#4435DC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              >
                Đọc bài viết
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Bộ lọc */}
        <div
          role="group"
          aria-label="Chủ đề bài viết"
          className="mt-8 flex flex-wrap gap-3 sm:gap-5"
        >
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={category === filter.id}
              onClick={() => setCategory(filter.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                category === filter.id
                  ? "bg-[#5143EF] text-white"
                  : "bg-[#F0ECF7] text-[#9255FF] hover:bg-[#E5DBF7]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Danh sách bài viết */}
        <section
          aria-labelledby="latest-activities-title"
          className="mt-8"
        >
          <h2
            id="latest-activities-title"
            className="text-2xl font-extrabold text-slate-900"
          >
            Bài viết mới nhất
          </h2>

          <p role="status" className="sr-only">
            Có {visiblePosts.length} bài viết
          </p>

          <div className="mt-7 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:gap-x-20">
            {visiblePosts.map((post) => (
              <article key={post.slug}>
                <Link
                  href={`/activities/${post.slug}`}
                  aria-label={`Đọc bài viết: ${post.title}`}
                  className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500"
                >
                  <PostCover post={post} />
                </Link>

                <h3 className="mt-4 text-xl font-bold leading-tight text-slate-900">
                  <Link
                    href={`/activities/${post.slug}`}
                    className="rounded-md transition-colors hover:text-[#5143EF] focus-visible:outline-2 focus-visible:outline-violet-500"
                  >
                    {post.title}
                  </Link>
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {post.excerpt}
                </p>

                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <CalendarDays
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-slate-900"
                  />

                  <span>
                    Cập nhật:{" "}
                    <time dateTime={post.updatedAt}>
                      {formatActivityDate(post.updatedAt)}
                    </time>
                  </span>
                </div>
              </article>
            ))}
          </div>

          {visiblePosts.length === 0 && (
            <p className="mt-7 rounded-2xl bg-[#F6F3FF] p-8 text-center text-sm text-slate-500">
              Chưa có bài viết thuộc chủ đề này.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Layers3,
  Search,
  Sparkles,
} from "lucide-react";

// Dữ liệu nhận từ API public /api/flashcards.
// API hiện tại trả về các trường này từ MongoDB.
type Language = "en" | "fr";

type PublicFlashcardSet = {
  _id: string;
  slug: string;
  title: string;
  description: string;
  language: Language;
  level: string;
  status?: "draft" | "published";
};

export default function FlashcardCatalog() {
  // Bộ thẻ được lấy từ MongoDB thay vì quizletSets.
  const [rows, setRows] = useState<PublicFlashcardSet[]>([]);
  const [language, setLanguage] = useState<Language>("en");
  const [search, setSearch] = useState("");

  // Trạng thái tải dữ liệu.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //bộ lọc trình độ
  const [level, setLevel] = useState("all");
  // Lấy danh sách trình độ thực tế theo ngôn ngữ đang chọn
  const levels = useMemo(() => {
    const uniqueLevels = new Set(
      rows
        .filter((item) => item.language === language)
        .map((item) => item.level?.trim())
        .filter((level): level is string => Boolean(level)),
    );

    // Sắp xếp trình độ theo thứ tự A1, A2, B1, B2, C1, C2
    return Array.from(uniqueLevels).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [rows, language]);

  // Tải bộ thẻ đã xuất bản từ Public API.
  useEffect(() => {
    const controller = new AbortController();

    async function loadFlashcards() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/flashcards", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(
            `Không tải được danh sách bộ thẻ (${res.status}).`,
          );
        }

        const data: unknown = await res.json();

        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu API không hợp lệ.");
        }

        // API phải lọc published ở phía server.
        // Frontend kiểm tra bổ sung nếu trường status có mặt.
        const published = (data as PublicFlashcardSet[]).filter(
          (set) =>
            set.status === undefined ||
            set.status === "published",
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

  // Lọc theo ngôn ngữ và từ khóa trên dữ liệu MongoDB.
  const sets = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase();

    return rows.filter((set) => {
      const matchLanguage = set.language === language;

      const matchLevel =
        level === "all" ||
        set.level.trim().toUpperCase() === level.toUpperCase();

      const matchSearch = [
        set.title,
        set.description,
        set.level,
      ].some((value) =>
        (value ?? "").toLocaleLowerCase().includes(keyword),
      );

      return matchLanguage && matchLevel && matchSearch;
    });
  }, [rows, language, level, search]);



  return (
    <main className="min-h-screen bg-white">
      {/* ===================================== */}
      {/* BANNER: GIỮ NGUYÊN THIẾT KẾ */}
      {/* ===================================== */}

      <section className="overflow-hidden bg-gradient-to-r from-[#F6F3FF] via-white to-[#EEE9FF] px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#5143EF]">
              HỌC TỪ VỰNG MỖI NGÀY
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Khám phá{" "}
              <span className="text-[#5143EF]">
                bộ từ vựng
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
              Chọn bộ thẻ phù hợp để bắt đầu học tiếng Anh hoặc
              tiếng Pháp cùng Quizlet.
            </p>

            <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-500">
              {[
                "Ôn tập mỗi ngày",
                "Học theo nhịp của bạn",
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-violet-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            aria-hidden="true"
            className="relative flex h-48 w-72 shrink-0 items-center justify-center sm:w-80"
          >
            {/* Card bên trái - nghiêng sang trái */}
            <div
              className="
      absolute left-5 top-7 z-0
      h-36 w-28 -rotate-12
      overflow-hidden rounded-2xl
      border border-violet-200
      bg-violet-100 shadow-md
      transition-transform duration-500
      hover:-rotate-6 hover:-translate-x-2
    "
            >
              {/* Chèn ảnh bên trái tại đây */}
              <img
                src="/images/flashcard-left.png"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            {/* Card bên phải - nghiêng sang phải */}
            <div
              className="
      absolute right-5 top-5 z-10
      h-36 w-28 rotate-12
      overflow-hidden rounded-2xl
      border border-violet-200
      bg-violet-100 shadow-md
      transition-transform duration-500
      hover:rotate-6 hover:translate-x-2
    "
            >
              {/* Chèn ảnh bên phải tại đây */}
              <img
                src="/images/flashcard-right.png"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            {/* Card chính ở giữa */}
            <div
              className="
      relative z-20 flex h-36 w-36
      flex-col items-center justify-center
      rounded-3xl border border-violet-100
      bg-white shadow-xl shadow-violet-200/50
      transition-transform duration-500
      hover:-translate-y-2
    "
            >
              <Sparkles
                aria-hidden="true"
                className="h-7 w-7 text-violet-500"
              />

              <strong className="mt-2 text-lg text-[#5143EF]">
                Bonjour
              </strong>

              <span className="text-xs text-slate-400">
                Xin chào
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================== */}
      {/* DANH SÁCH FLASHCARDS */}
      {/* ===================================== */}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-start gap-5">
          <div className="relative mx-auto w-full max-w-2xl">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              aria-label="Tìm bộ từ vựng"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên bộ thẻ, chủ đề, trình độ..."
              className="w-full rounded-2xl border border-violet-100 bg-white py-3.5 pl-12 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          {/* Dropdown lọc theo trình độ */}
          <div className="w-full sm:w-44">
            <label htmlFor="flashcard-level" className="sr-only">
              Lọc theo trình độ
            </label>

            <select
              id="flashcard-level"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="h-12 -ms-4 w-full cursor-pointer rounded-xl border border-violet-100 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="all">Tất cả trình độ</option>

              {levels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Bộ lọc ngôn ngữ */}
          <div
            role="group"
            aria-label="Lọc theo ngôn ngữ"
            className="flex gap-2 rounded-3xl bg-[#F6F3FF] p-1.5"
          >
            {(
              [
                { value: "en", label: "🇬🇧 Tiếng Anh" },
                { value: "fr", label: "🇫🇷 Tiếng Pháp" },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={language === item.value}
                onClick={() => {
                  setLanguage(item.value);
                  setSearch("");
                  setLevel("all"); // Reset bộ lọc trình độ khi đổi ngôn ngữ
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${language === item.value
                  ? "bg-[#5143EF] text-white shadow-sm"
                  : "text-slate-600 hover:bg-white"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>


        {/* Loading Skeleton - mô phỏng các card Flashcard */}
        {loading ? (
          <div
            role="status"
            aria-label="Đang tải danh sách Flashcard"
            aria-busy="true"
            className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm"
              >
                {/* Skeleton ảnh đại diện */}
                <div className="flex h-44 items-center justify-center bg-[#F6F3FF]">
                  <div className="h-24 w-28 animate-pulse rounded-2xl bg-violet-100 motion-reduce:animate-none" />
                </div>

                {/* Skeleton nội dung */}
                <div className="space-y-4 p-5">
                  {/* Nhãn bộ từ vựng */}
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />

                  {/* Tiêu đề */}
                  <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />

                  {/* Mô tả */}
                  <div className="space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Lỗi API: không hiển thị nhầm thành danh sách rỗng.
          <div
            role="alert"
            className="mt-8 rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center"
          >
            <h3 className="font-bold text-red-700">
              Không thể tải bộ từ vựng
            </h3>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700"
            >
              Thử lại
            </button>
          </div>
        ) : sets.length > 0 ? (
          // Danh sách card lấy từ MongoDB.
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((set, index) => (
              <Link
                key={set._id}
                href={`/flashcards/${encodeURIComponent(set.slug)}`}
                className="group overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              >
                <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-[#EEE9FF] via-[#F9F7FF] to-[#E8F0FF]">
                  <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-violet-200/50" />
                  <div className="absolute -bottom-10 -right-6 h-32 w-32 rounded-full bg-blue-200/40" />

                  <div className="relative flex h-24 w-28 -rotate-12 items-center justify-center rounded-2xl bg-white/80 shadow-md">
                    <BookOpen className="h-9 w-9 text-violet-400" />
                  </div>

                  <div className="relative -ml-5 flex h-28 w-32 rotate-6 items-center justify-center rounded-2xl bg-white shadow-lg">
                    <Layers3 className="h-11 w-11 text-[#5143EF]" />
                  </div>

                  <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-600">
                    {set.level}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold text-violet-600">
                    Bộ từ vựng {index + 1}
                  </p>

                  <h3 className="mt-2 line-clamp-2 text-lg font-bold text-slate-900">
                    {set.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                    {set.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // Không có bộ thẻ phù hợp.
          <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-3xl  px-6 text-center">
            <Search className="h-10 w-10 text-violet-400" />

            <h3 className="mt-4 font-bold text-slate-900">
              Không tìm thấy dữ liệu
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Thử từ khóa khác hoặc chuyển ngôn ngữ.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

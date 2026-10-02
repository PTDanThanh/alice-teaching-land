"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  Presentation,
  Search,
  Star,
} from "lucide-react";

import {
  materials,
  materialLanguages,
  materialLevels,
  materialFormats,
  materialTypeFilters,
  formatMaterialDate,
  normalizeMaterialText,
  type MaterialLanguage,
  type MaterialTypeFilter,
  type MaterialLevel,
} from "@/data/materials";

interface MaterialLibraryProps {
  initialLanguage?: MaterialLanguage;
  initialType?: MaterialTypeFilter;
}

export default function MaterialLibrary({
  initialLanguage = "en",
  initialType = "all",
}: MaterialLibraryProps) {
  const [language, setLanguage] =
    useState<MaterialLanguage>(initialLanguage);

  const [type, setType] =
    useState<MaterialTypeFilter>(initialType);

  const [level, setLevel] =
    useState<MaterialLevel | "all">("all");

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = normalizeMaterialText(searchQuery);

  const filteredMaterials = materials.filter((material) => {
    const searchableText = normalizeMaterialText(
      `${material.title} ${material.description} ${material.collection}`,
    );

    return (
      material.language === language &&
      (type === "all" || material.type === type) &&
      (level === "all" || material.level === level) &&
      searchableText.includes(normalizedQuery)
    );
  });

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput);
  }

  function resetFilters() {
    setType("all");
    setLevel("all");
    setSearchInput("");
    setSearchQuery("");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Tiêu đề và tìm kiếm */}
      <section
        aria-labelledby="materials-title"
        className="bg-[#F6F3FF] px-4 pb-14 pt-10 sm:px-6 lg:pb-16 lg:pt-12"
      >
        <div className="mx-auto max-w-7xl text-center">
          <h1
            id="materials-title"
            className="text-3xl font-extrabold tracking-tight text-[#9255FF] sm:text-4xl"
          >
            Thư Viện Tài Liệu
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
            Nơi tổng hợp bài học, bài giảng và tài liệu ôn tập hiệu quả
          </p>

          <form
            onSubmit={handleSearch}
            role="search"
            className="mx-auto mt-7 flex max-w-5xl flex-wrap items-center gap-2 rounded-2xl bg-white p-2 sm:flex-nowrap"
          >
            <label htmlFor="material-search" className="sr-only">
              Tìm kiếm tài liệu
            </label>

            <Search
              aria-hidden="true"
              className="ml-2 h-5 w-5 shrink-0 text-slate-900"
            />

            <input
              id="material-search"
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="Tìm kiếm tài liệu ôn tập..."
              className="min-w-0 flex-1 rounded-lg px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-[#9255FF] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#7B42E5] focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {/* Khung ngôn ngữ nhô lên nền tím */}
        <div
          role="group"
          aria-label="Ngôn ngữ tài liệu"
          className="relative z-10 mx-auto -mt-6 flex max-w-lg rounded-2xl bg-slate-100 p-1 shadow-sm"
        >
          {materialLanguages.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={language === item.id}
              onClick={() => setLanguage(item.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 sm:gap-3 sm:text-xl ${language === item.id
                ? "bg-[#9255FF] text-white"
                : "text-[#9255FF] hover:bg-violet-100"
                }`}
            >
              <span aria-hidden="true" className="text-2xl">
                {item.flag}
              </span>

              {item.label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-8 grid grid-cols-2 max-w-8xl items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            aria-label="Bộ lọc tài liệu"
            className="sticky top-24 z-40 rounded-2xl bg-[#F6F3FF] p-5"
          >
            <h2 className="text-lg font-bold text-slate-900">
              Bộ lọc tài liệu
            </h2>

            <div className=" mt-5 space-y-4">
              <div>
                <label
                  htmlFor="material-type"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Định dạng tài liệu
                </label>
                <select
                  id="material-type"
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as MaterialTypeFilter)
                  }
                  className="w-full cursor-pointer rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-violet-500"
                >
                  {materialTypeFilters.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="material-level"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Trình độ
                </label>
                <select
                  id="material-level"
                  value={level}
                  onChange={(event) =>
                    setLevel(event.target.value as MaterialLevel | "all")
                  }
                  className="w-full cursor-pointer rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-violet-500"
                >
                  <option value="all">Tất cả trình độ</option>
                  {materialLevels.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <section aria-labelledby="featured-materials-title" className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Star
                aria-hidden="true"
                className="h-9 w-9 fill-[#9255FF] text-[#9255FF]"
                strokeWidth={1}
              />

              <h2
                id="featured-materials-title"
                className="text-[20px] font-bold text-[#9255FF] sm:text-2xl"
              >
                Tài liệu nổi bật
              </h2>

            </div>


            <p
              role="status"
              className="mt-3 text-[16px] font-extralight text-slate-500 sm:ml-12"
            >
              Tìm thấy {filteredMaterials.length} tài liệu
            </p>

            {/* Các thẻ tài liệu */}
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:gap-x-16 lg:gap-y-10">
              {filteredMaterials.map((material) => {
                const format = materialFormats[material.type];

                const Icon =
                  material.type === "powerpoint"
                    ? Presentation
                    : FileText;

                return (
                  <article
                    key={material.id}
                    className="flex flex-col rounded-3xl border border-slate-300 bg-white p-5 transition-shadow hover:shadow-md sm:p-6"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${format.iconClass}`}
                      >
                        <Icon
                          aria-hidden="true"
                          className="h-8 w-8"
                          strokeWidth={1.5}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-0.5 text-xs font-medium ${format.badgeClass}`}
                          >
                            {format.label}
                          </span>

                          <span className="rounded-full bg-fuchsia-100 px-3 py-0.5 text-xs font-medium text-fuchsia-900">
                            {material.collection}
                          </span>
                        </div>

                        <h3 className="mt-3 line-clamp-2 text-base font-bold leading-6 text-slate-900">
                          {material.title}
                        </h3>

                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {material.description}
                        </p>

                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 sm:text-sm">
                          <CalendarDays
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-slate-700"
                          />

                          <span>
                            Cập nhật:{" "}
                            <time dateTime={material.updatedAt}>
                              {formatMaterialDate(material.updatedAt)}
                            </time>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-5">
                      <Link
                        href={`/materials/${material.id}`}
                        aria-label={`Xem chi tiết: ${material.title}`}
                        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[#F6F3FF] px-4 py-2 font-semibold text-[#9255FF] transition-colors hover:bg-[#EAE2FF] focus-visible:outline-2 focus-visible:outline-violet-500"
                      >
                        Mở tài liệu
                        {/* <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4"
                      /> */}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Không có kết quả */}
            {filteredMaterials.length === 0 && (
              <div className="mt-8 rounded-3xl bg-[#F6F3FF] px-6 py-12 text-center">
                <Search
                  aria-hidden="true"
                  className="mx-auto h-10 w-10 text-[#9255FF]"
                />

                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Không tìm thấy tài liệu phù hợp
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  Thử từ khóa khác hoặc bỏ bớt các bộ lọc.
                </p>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 rounded-xl bg-[#5143EF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4435DC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
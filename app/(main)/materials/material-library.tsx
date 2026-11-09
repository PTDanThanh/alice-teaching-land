"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowRight, Bookmark, CalendarDays, Check, Clock3, Download,
  Eye, FileText, Flame, Presentation, RotateCcw, Search,
  SlidersHorizontal, Star, TrendingUp,
} from "lucide-react";
import {
  materials, materialLanguages, materialLevels, materialFormats,
  materialTypeFilters, formatMaterialDate, normalizeMaterialText,
  type MaterialLanguage, type MaterialTypeFilter, type MaterialLevel,
} from "@/data/materials";
import Pagination from "@/components/ui/pagination";

interface MaterialLibraryProps {
  initialLanguage?: MaterialLanguage;
  initialType?: MaterialTypeFilter;
}

type SortOrder = "newest" | "oldest" | "title";
type Material = (typeof materials)[number];

export default function MaterialLibrary({
  initialLanguage = "en",
  initialType = "all",
}: MaterialLibraryProps) {
  const [language, setLanguage] = useState<MaterialLanguage>(initialLanguage);
  const [types, setTypes] = useState<MaterialTypeFilter[]>(initialType === "all" ? [] : [initialType]);
  const [level, setLevel] = useState<MaterialLevel | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  // Danh sách tài liệu lấy từ MongoDB
  const [materialRows, setMaterialRows] = useState<Material[]>([]);

  // Trạng thái tải dữ liệu
  const [loading, setLoading] = useState(true);

  // Lỗi tải dữ liệu
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMaterials() {
      try {
        setLoading(true);
        setLoadError(null);

        // Lấy tất cả tài liệu đã xuất bản từ MongoDB
        const response = await fetch("/api/materials", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Không thể tải danh sách tài liệu.");
        }

        const data: unknown = await response.json();

        // API hiện tại trả về mảng trực tiếp
        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu tài liệu không đúng định dạng.");
        }

        if (!controller.signal.aborted) {
          setMaterialRows(data as Material[]);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("[MaterialLibrary] Lỗi tải tài liệu:", error);

        setLoadError("Không thể tải tài liệu. Vui lòng thử lại.");
        setMaterialRows([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadMaterials();

    return () => {
      controller.abort();
    };
  }, []);

  // Lọc tài liệu theo ngôn ngữ từ dữ liệu MongoDB
  const languageMaterials = useMemo(
    () => materialRows.filter((item) => item.language === language),
    [materialRows, language]
  );
  //mỗi trang có 6 tài liệu
  const ITEMS_PER_PAGE = 6;
  //trang hiện tại
  const [currentPage, setCurrentPage] = useState(1);



  const filteredMaterials = useMemo(() => {
    const query = normalizeMaterialText(searchQuery);
    return languageMaterials
      .filter((item) => {
        const text = normalizeMaterialText(`${item.title} ${item.description} ${item.collection}`);
        return (types.length === 0 || types.includes(item.type as MaterialTypeFilter)) &&
          (level === "all" || item.level === level) &&
          (!selectedCollection || item.collection === selectedCollection) &&
          text.includes(query);
      })
      .sort((a, b) => {
        if (sortOrder === "title") return a.title.localeCompare(b.title, "vi");
        const delta = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        return sortOrder === "newest" ? delta : -delta;
      });
  }, [languageMaterials, types, level, selectedCollection, searchQuery, sortOrder]);

  // Sử dụng danh sách sau khi đã lọc và sắp xếp
  const displayMaterials = filteredMaterials;

  // Tổng số trang
  const totalPages = Math.max(1,
    Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE)
  );

  // Lấy tài liệu của trang hiện tại
  const paginatedMaterials = displayMaterials.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const collections = useMemo(() => {
    const counts = new Map<string, number>();
    languageMaterials.forEach((item) => counts.set(item.collection, (counts.get(item.collection) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [languageMaterials]);

  const newestMaterials = useMemo(() => [...languageMaterials].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  ).slice(0, 3), [languageMaterials]);

  function resetFilters() {
    setTypes([]);
    setLevel("all");
    setSelectedCollection(null);
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput);
    setCurrentPage(1)
  }

  function toggleType(value: MaterialTypeFilter) {
    setCurrentPage(1);
    if (value === "all") { setTypes([]); return; }
    setTypes((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  function toggleSaved(id: string) {
    setSavedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  function iconFor(item: Material) {
    return item.type === "powerpoint" ? Presentation : FileText;
  }

  function iconColors(type: string) {
    if (type === "powerpoint") return "bg-orange-50 text-orange-600";
    if (type === "pdf") return "bg-red-50 text-red-600";
    return "bg-blue-50 text-blue-600";
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Giữ nguyên khu vực hero và thanh tìm kiếm */}
      <section aria-labelledby="materials-title" className="bg-[#F6F3FF] px-4 pb-14 pt-10 sm:px-6 lg:pb-16 lg:pt-12">
        <div className="mx-auto max-w-7xl text-center">
          <h1 id="materials-title" className="text-3xl font-extrabold tracking-tight text-[#9255FF] sm:text-4xl">Thư Viện Tài Liệu</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">Nơi tổng hợp bài học, bài giảng và tài liệu ôn tập hiệu quả</p>
          <form onSubmit={handleSearch} role="search" className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl bg-white p-2 shadow-sm sm:flex-nowrap">
            <label htmlFor="material-search" className="sr-only">Tìm kiếm tài liệu</label>
            <Search aria-hidden="true" className="ml-2 h-5 w-5 shrink-0 text-slate-700" />
            <input id="material-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm kiếm tài liệu ôn tập..." className="min-w-0 flex-1 rounded-lg text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base" />
            <button type="submit" className="w-full rounded-xl bg-[#9255FF] px-4 py-2.5 font-semibold text-white transition hover:bg-[#7B42E5] sm:w-auto">Tìm kiếm</button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-[1600px] px-4 pb-20 sm:px-6 xl:px-8">
        {/* Tabs Tiếng Anh / Tiếng Pháp */}
        <div role="group" aria-label="Ngôn ngữ tài liệu" className="relative z-10 mx-auto -mt-6 flex max-w-lg rounded-2xl bg-slate-100 p-1 shadow-sm">
          {materialLanguages.map((item) => (
            <button key={item.id} type="button" aria-pressed={language === item.id}
              onClick={() => { setLanguage(item.id); resetFilters(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-base font-semibold transition sm:gap-3 sm:text-xl ${language === item.id ? "bg-[#9255FF] text-white shadow-sm" : "text-[#9255FF] hover:bg-violet-100"}`}>
              <span aria-hidden="true" className="text-2xl">{item.flag}</span>{item.label}
            </button>
          ))}
        </div>

        {/* Layout: bộ lọc / tài liệu / thông tin bên phải */}
        <div className="mt-9 grid items-start gap-6 lg:grid-cols-[235px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_245px] 2xl:gap-7">
          <aside
            aria-label="Bộ lọc tài liệu"
            className="flex flex-col rounded-3xl bg-gradient-to-b from-[#F8F6FF] to-white p-5 shadow-sm ring-1 ring-violet-50 lg:sticky lg:top-6 lg:h-[calc(86dvh-3rem)] lg:min-h-0 lg:self-start"
          >
            {/* 1. Tiêu đề cố định, không cuộn theo danh sách */}
            <div className="flex shrink-0 items-center gap-3 pb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <SlidersHorizontal className="h-5 w-5" />
              </span>
              <h2 className="font-bold">Bộ lọc tài liệu</h2>
            </div>

            {/* 2. Chỉ phần nội dung bộ lọc được cuộn */}
            <div className="min-h-0 flex-1 lg:overflow-y-auto">

              {/* <div className="mt-7 flex items-center gap-2 text-sm font-bold"><Star className="h-4 w-4" />Định dạng tài liệu</div> */}
              <div className="mt-3 space-y-1.5">
                {materialTypeFilters.map((filter) => {
                  const isAll = filter.id === "all";
                  const checked = isAll ? types.length === 0 : types.includes(filter.id);
                  const count = isAll ? languageMaterials.length : languageMaterials.filter((item) => item.type === filter.id).length;
                  return (
                    <label key={filter.id} className={`flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm transition ${checked ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-violet-50"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleType(filter.id)} className="h-4 w-4 accent-violet-600" />
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${isAll ? "bg-violet-200 text-violet-700" : iconColors(filter.id)}`}>
                        {isAll ? <FileText className="h-4 w-4" /> : filter.id === "powerpoint" ? <Presentation className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1 font-medium">{filter.label}</span>
                      <span className="rounded-lg bg-white/80 px-2 py-0.5 text-xs font-bold">{count}</span>
                    </label>
                  );
                })}
              </div>

              {/* Bộ lọc trình độ - hiển thị checkbox giống bộ lọc định dạng */}
              <div className="mt-8 flex items-center gap-2 text-sm font-bold">
                <TrendingUp className="h-4 w-4" />
                Trình độ
              </div>

              <div className="mt-3 space-y-1.5">
                {(["all", ...materialLevels] as const).map((item) => {
                  const isAll = item === "all";
                  const checked = level === item;

                  return (
                    <label
                      key={item}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm transition ${checked
                        ? "bg-violet-100 text-violet-700"
                        : "text-slate-600 hover:bg-violet-50"
                        }`}
                    >
                      {/* Checkbox chọn trình độ */}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setLevel(item);
                          setCurrentPage(1);
                        }}
                        className="h-4 w-4 accent-violet-600"
                      />

                      {/* Tên trình độ */}
                      <span className="min-w-0 flex-1 font-medium">
                        {isAll ? "Tất cả trình độ" : item}
                      </span>

                      {/* Số lượng tài liệu theo trình độ */}
                      <span className="rounded-lg bg-white/80 px-2 py-0.5 text-xs font-bold">
                        {isAll
                          ? languageMaterials.length
                          : languageMaterials.filter(
                            (material) => material.level === item
                          ).length}
                      </span>
                    </label>
                  );
                })}
              </div>

              <button type="button" onClick={resetFilters} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-100 px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-200">
                <RotateCcw className="h-4 w-4" /> Xóa bộ lọc
              </button>
            </div>
          </aside>

          <main className="min-w-0" aria-labelledby="featured-materials-title">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Star className="mt-1 h-6 w-6 shrink-0 fill-violet-600 text-violet-600" strokeWidth={1} />
                <div>
                  <h2 id="featured-materials-title" className="text-xl font-extrabold text-violet-600 sm:text-2xl">Tài liệu nổi bật</h2>
                  <p role="status" className="mt-1 text-[14px] text-slate-500">Tìm thấy {filteredMaterials.length} tài liệu phù hợp</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <label htmlFor="material-sort" className="font-semibold">Sắp xếp theo</label>
                <select id="material-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-violet-300">
                  <option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="title">Tên A–Z</option>
                </select>
              </div>
            </div>

            {/* Danh sách tài liệu */}
            <div
              className="
    mt-5 grid items-start gap-4
    auto-rows-auto
    md:grid-cols-2
    2xl:grid-cols-3
  "
            >
              {/* Loading Skeleton - hiển thị 6 card giả lập */}
              {loading &&
                Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                  <article
                    key={`material-skeleton-${index}`}
                    aria-hidden="true"
                    className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="animate-pulse space-y-4 motion-reduce:animate-none">
                      {/* Icon định dạng và nhãn */}
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 shrink-0 rounded-2xl bg-violet-100" />

                        <div className="flex flex-1 flex-wrap gap-2 pt-2">
                          <div className="h-5 w-14 rounded-full bg-slate-200" />
                          <div className="h-5 w-20 rounded-full bg-slate-100" />
                        </div>

                        {/* Icon lưu tài liệu */}
                        <div className="h-5 w-5 rounded bg-slate-100" />
                      </div>

                      {/* Tiêu đề tài liệu */}
                      <div className="space-y-2">
                        <div className="h-4 w-full rounded bg-slate-200" />
                        <div className="h-4 w-3/4 rounded bg-slate-200" />
                      </div>

                      {/* Mô tả */}
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded bg-slate-100" />
                        <div className="h-3 w-5/6 rounded bg-slate-100" />
                      </div>
                    </div>

                    {/* Ngày cập nhật và nút xem tài liệu */}
                    <div className="mt-auto animate-pulse space-y-4 pt-5 motion-reduce:animate-none">
                      <div className="h-3 w-2/3 rounded bg-slate-100" />
                      <div className="h-10 w-full rounded-xl bg-violet-200" />
                    </div>
                  </article>
                ))}
              {!loading && !loadError && paginatedMaterials.map((material) => {
                const format = materialFormats[material.type];
                const Icon = iconFor(material);
                const saved = savedIds.includes(material.id);

                return (
                  <article
                    key={material.id}
                    className="
        flex min-h-[280px] min-w-0 flex-col
        rounded-2xl border border-slate-200
        bg-white p-4 shadow-sm
        transition hover:-translate-y-0.5
        hover:border-violet-200 hover:shadow-md
      "
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconColors(material.type)}`}><Icon className="h-8 w-8" strokeWidth={2} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${format.badgeClass}`}>{format.label}</span>
                          <span className="max-w-full truncate rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">{material.collection}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => toggleSaved(material.id)} aria-label={saved ? `Bỏ lưu ${material.title}` : `Lưu ${material.title}`} aria-pressed={saved} className="shrink-0 text-slate-400 hover:text-violet-600">
                        <Bookmark className={`h-5 w-5 ${saved ? "fill-violet-500 text-violet-500" : ""}`} />
                      </button>
                    </div>
                    <h3 className="mt-3 line-clamp-2 min-h-12 text-sm font-bold leading-6 text-slate-900">{material.title}</h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{material.description}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-5 text-[11px] text-slate-500">
                      <span className="flex min-w-0 items-center gap-1.5"><CalendarDays className="h-4 w-4 shrink-0" />Cập nhật: <time dateTime={material.updatedAt}>{formatMaterialDate(material.updatedAt)}</time></span>
                    </div>
                    <Link
                      href={`/materials/${material.id}`}
                      aria-label={`Xem tài liệu: ${material.title}`}
                      className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#9255FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7B42E5]"
                    >
                      <Eye className="h-4 w-4" />
                      Xem tài liệu
                    </Link>
                  </article>
                );
              })}

              {/* Hiển thị thông báo ngay giữa khu vực danh sách tài liệu */}
              {!loading && !loadError && filteredMaterials.length === 0 && (
                <div className="col-span-full flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                  <Search className="h-10 w-10 text-violet-500" />

                  <h3 className="mt-4 text-lg font-bold">
                    Không tìm thấy tài liệu phù hợp
                  </h3>

                  <p className="mt-2 text-sm text-slate-600">
                    Thử từ khóa khác hoặc bỏ bớt bộ lọc.
                  </p>
                </div>
              )}

              {!loading &&
                !loadError &&
                paginatedMaterials.length > 0 &&
                Array.from({
                  length: Math.max(0, ITEMS_PER_PAGE - paginatedMaterials.length),
                }).map((_, index) => (
                  <div
                    key={`material-grid-placeholder-${index}`}
                    aria-hidden="true"
                  />
                ))}
            </div>


            {/* Phân trang nằm ngay dưới danh sách */}
            {!loading && !loadError && (
              <div className="mt-8 flex shrink-0 justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}


            {loadError && (
              <p role="alert" className="mt-6 text-center text-sm text-red-600">
                {loadError}
              </p>
            )}


          </main>

          <aside aria-label="Khám phá tài liệu" className="grid gap-5 sm:grid-cols-2 lg:col-span-2 xl:col-span-1 xl:grid-cols-1">
            <section className="rounded-3xl bg-gradient-to-b from-[#F8F6FF] to-white p-4 shadow-sm ring-1 ring-violet-50">
              <h2 className="flex items-center gap-2 text-sm font-extrabold"><span className="rounded-lg bg-violet-100 p-2 text-violet-600"><Flame className="h-4 w-4" /></span>Chủ đề phổ biến</h2>
              <div className="mt-4 space-y-2">
                {collections.map(([name, count], index) => (
                  <button key={name} type="button" onClick={() => setSelectedCollection((current) => current === name ? null : name)} className={`flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left text-xs transition hover:bg-violet-50 ${selectedCollection === name ? "font-bold text-violet-700" : "text-slate-700"}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold ${["bg-rose-100 text-rose-600", "bg-amber-100 text-amber-600", "bg-emerald-100 text-emerald-600", "bg-blue-100 text-blue-600", "bg-slate-100 text-slate-600"][index]}`}>{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{name}</span><span className="rounded-full bg-violet-50 px-2 py-1 font-bold text-slate-600">{count}</span>
                  </button>
                ))}
                {collections.length === 0 && <p className="text-xs text-slate-500">Chưa có chủ đề.</p>}
              </div>
            </section>
            <section className="rounded-3xl bg-gradient-to-b from-[#F8F6FF] to-white p-4 shadow-sm ring-1 ring-violet-50">
              <h2 className="flex items-center gap-2 text-sm font-extrabold"><span className="rounded-lg bg-violet-100 p-2 text-violet-600"><Clock3 className="h-4 w-4" /></span>Tài liệu mới nhất</h2>
              <div className="mt-4 space-y-3">
                {newestMaterials.map((material) => {
                  const Icon = iconFor(material);
                  return <Link key={material.id} href={`/materials/${material.id}`} className="flex items-center gap-3 rounded-lg hover:bg-violet-50">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconColors(material.type)}`}><Icon className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{material.title}</span><span className="mt-1 block text-[11px] text-slate-400">{formatMaterialDate(material.updatedAt)}</span></span>
                  </Link>;
                })}
                {newestMaterials.length === 0 && <p className="text-xs text-slate-500">Chưa có tài liệu.</p>}
              </div>
              {/* <button type="button" onClick={resetFilters} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-100 px-3 py-3 text-xs font-bold text-violet-700 hover:bg-violet-200">Xem tất cả tài liệu <ArrowRight className="h-4 w-4" /></button> */}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

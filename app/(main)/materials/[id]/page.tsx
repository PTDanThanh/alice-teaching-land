import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CalendarDays,
    Download,
    ExternalLink,
    FileText,
    GraduationCap,
    Languages,
    Presentation,
} from "lucide-react";

import {
    materials,
    materialFormats,
    getMaterialById,
    formatMaterialDate,
} from "@/data/materials";

interface MaterialDetailPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({
    params,
}: MaterialDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    const material = getMaterialById(id);

    if (!material) {
        return {
            title: "Không tìm thấy tài liệu | Alice In Teachingland",
        };
    }

    return {
        title: `${material.title} | Alice In Teachingland`,
        description: material.description,
    };
}

export default async function MaterialDetailPage({
    params,
}: MaterialDetailPageProps) {
    const { id } = await params;
    const material = getMaterialById(id);

    if (!material) {
        notFound();
    }

    const format = materialFormats[material.type];

    const Icon =
        material.type === "powerpoint" ? Presentation : FileText;

    const languageName =
        material.language === "en" ? "Tiếng Anh" : "Tiếng Pháp";

    const backUrl =
        `/materials?language=${material.language}&type=${material.type}`;

    const relatedMaterials = materials
        .filter(
            (item) =>
                item.id !== material.id &&
                item.language === material.language,
        )
        .slice(0, 3);

    const primaryButtonClass =
        "flex items-center justify-center gap-2 rounded-xl bg-[#5143EF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4435DC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";

    return (
        <div className="min-h-screen bg-white">
            {/* Tiêu đề tài liệu */}
            <section className="bg-[#F6F3FF] px-4 py-8 sm:px-6 lg:py-6">
                <div className="mx-auto max-w-6xl">

                    <div className="mt-7 flex items-start gap-4 sm:gap-6">
                        <div
                            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:h-20 sm:w-20 ${format.iconClass}`}
                        >
                            <Icon
                                aria-hidden="true"
                                className="h-9 w-9 sm:h-11 sm:w-11"
                                strokeWidth={1.5}
                            />
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${format.badgeClass}`}
                                >
                                    {format.label}
                                </span>

                                <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-900">
                                    {material.collection}
                                </span>
                            </div>

                            <h1 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
                                {material.title}
                            </h1>

                            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                                {material.description}
                            </p>
                        </div>
                        {/* Thông tin chi tiết */}
                        <aside
                            aria-labelledby="material-info-title"
                            className="rounded-2xl py-8 border border-[#EAE3FF] bg-white p-6"
                        >
                            <h2
                                id="material-info-title"
                                className="text-lg font-bold text-slate-900"
                            >
                                Thông tin tài liệu
                            </h2>

                            <dl className="mt-4 grid grid-flow-col grid-rows-2 gap-x-4 gap-y-5 text-sm">
                                <div>
                                    <dt className="flex items-center gap-2 text-slate-500">
                                        <Languages
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                        />
                                        Ngôn ngữ
                                    </dt>
                                    <dd className="mt-1 pl-6 font-semibold text-slate-900">
                                        {languageName}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="flex items-center gap-2 text-slate-500">
                                        <GraduationCap
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                        />
                                        Trình độ
                                    </dt>
                                    <dd className="mt-1 pl-6 font-semibold text-slate-900">
                                        {material.level}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="flex items-center gap-2 text-slate-500">
                                        <BookOpen
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                        />
                                        Bộ tài liệu
                                    </dt>
                                    <dd className="mt-1 pl-6 font-semibold text-slate-900">
                                        {material.collection}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="flex items-center gap-2 text-slate-500">
                                        <FileText
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                        />
                                        Định dạng
                                    </dt>
                                    <dd className="mt-1 pl-6 font-semibold text-slate-900">
                                        {format.label}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="flex items-center gap-2 text-slate-500">
                                        <CalendarDays
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                        />
                                        Cập nhật
                                    </dt>
                                    <dd className="mt-1 pl-6 font-semibold text-slate-900">
                                        <time dateTime={material.updatedAt}>
                                            {formatMaterialDate(material.updatedAt)}
                                        </time>
                                    </dd>
                                </div>
                            </dl>

                            {material.downloadUrl ? (
                                <div className="mt-7 space-y-3">
                                    <a
                                        href={material.downloadUrl}
                                        download
                                        className={primaryButtonClass}
                                    >
                                        <Download
                                            aria-hidden="true"
                                            className="h-5 w-5"
                                        />
                                        Tải xuống
                                    </a>

                                    <a
                                        href={material.downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-[#5143EF] transition-colors hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500"
                                    >
                                        <ExternalLink
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                        />
                                        Mở file ở tab mới
                                    </a>
                                </div>
                            ) : (
                                <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-500">
                                    File tài liệu chưa được bổ sung.
                                </p>
                            )}
                        </aside>
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                <Link
                    href={backUrl}
                    className="inline-flex items-center mb-2 gap-2 rounded-lg text-[16px] font-semibold text-[#5143EF] hover:underline focus-visible:outline-2 focus-visible:outline-violet-500"
                >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Quay về thư viện tài liệu
                </Link>
                <div className="grid items-start gap-6">

                    {/* Xem trước tài liệu */}
                    <section
                        aria-labelledby="material-preview-title"
                        className="w-full overflow-hidden rounded-3xl bg-white"
                    >



                        {material.type === "pdf" && material.downloadUrl ? (
                            <iframe
                                src={material.downloadUrl}
                                title={`Xem trước: ${material.title}`}
                                className="h-[70vh] min-h-[400px] w-full border-0"
                            />
                        ) : (
                            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
                                <div
                                    className={`flex h-20 w-20 items-center justify-center rounded-2xl ${format.iconClass}`}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="h-12 w-12"
                                        strokeWidth={1.25}
                                    />
                                </div>

                                <h3 className="mt-5 text-lg font-bold text-slate-900">
                                    {material.downloadUrl
                                        ? "Tải tài liệu để xem đầy đủ"
                                        : "Tài liệu đang được cập nhật"}
                                </h3>

                                <p className="mt-3 max-w-md text-[16px] leading-6 text-slate-500">
                                    {material.downloadUrl
                                        ? `Bạn có thể tải file ${format.label} và mở bằng ứng dụng phù hợp trên thiết bị.`
                                        : "File học tập sẽ được bổ sung sau. Bạn có thể xem thông tin tài liệu ở bên cạnh."}
                                </p>

                                {material.downloadUrl && (
                                    <a
                                        href={material.downloadUrl}
                                        download
                                        className={`mt-6 ${primaryButtonClass}`}
                                    >
                                        <Download
                                            aria-hidden="true"
                                            className="h-5 w-5"
                                        />
                                        Tải tài liệu
                                    </a>
                                )}
                            </div>
                        )}
                    </section>


                </div>

                {/* Tài liệu liên quan */}
                {relatedMaterials.length > 0 && (
                    <section
                        aria-labelledby="related-materials-title"
                        className="mt-12"
                    >
                        <h2
                            id="related-materials-title"
                            className="text-xl font-bold text-slate-900"
                        >
                            Những tài liệu khác bạn có thể quan tâm
                        </h2>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {relatedMaterials.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/materials/${item.id}`}
                                    className="flex flex-col rounded-2xl border border-[#EAE3FF] bg-[#F6F3FF] p-5 transition-colors hover:bg-[#EAE2FF] focus-visible:outline-2 focus-visible:outline-violet-500"
                                >
                                    <span className="text-xs font-semibold text-[#5143EF]">
                                        {materialFormats[item.type].label} · {item.level}
                                    </span>

                                    <h3 className="mt-2 text-base font-bold text-slate-900">
                                        {item.title}
                                    </h3>

                                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                                        {item.description}
                                    </p>

                                    <span className="mt-auto flex items-center gap-2 pt-4 text-sm font-semibold text-[#5143EF]">
                                        Mở tài liệu
                                        <ArrowRight
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                        />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
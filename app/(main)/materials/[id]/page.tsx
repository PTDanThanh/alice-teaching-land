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

import DocxPreview from "@/components/materials/docx-preview";
import RelatedMaterialsCarousel from "@/components/materials/related-materials-carousel";
import { formatMaterialDate, materialFormats } from "@/data/materials";
import {
    getPublishedMaterialById,
    getRelatedMaterials,
} from "@/lib/material-detail";

interface MaterialDetailPageProps {
    params: Promise<{ id: string }>;
}


export async function generateMetadata({
    params,
}: MaterialDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    const material = await getPublishedMaterialById(id);

    if (!material) {
        return { title: "Không tìm thấy tài liệu | Alice In Teachingland" };
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
    const material = await getPublishedMaterialById(id);
    if (!material) notFound();

    const relatedMaterials = await getRelatedMaterials(material);
    const format = materialFormats[material.type];
    const Icon = material.type === "powerpoint" ? Presentation : FileText;
    const languageName = material.language === "en" ? "Tiếng Anh" : "Tiếng Pháp";
    const backUrl = `/materials?language=${material.language}&type=${material.type}`;

    // Luôn truy cập file qua API có kiểm tra trạng thái published và ký URL R2.
    // Không dùng downloadUrl (object key riêng tư) trực tiếp trong href/src.
    const fileUrl = material.downloadUrl
        ? `/api/materials/${encodeURIComponent(material.id)}/file`
        : null;

    const primaryButtonClass =
        "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#5143EF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4435DC] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";

    const isPdf = material.downloadUrl?.toLowerCase().endsWith(".pdf") ?? false;
    const isDocx = material.downloadUrl?.toLowerCase().endsWith(".docx") ?? false;

    // Kiểm tra định dạng PowerPoint
    const isPowerPoint = material.type === "powerpoint";

    // Chỉ hiển thị iframe khi đã có PDF Preview
    const powerpointPreviewUrl =
        isPowerPoint && material.previewKey
            ? `/api/materials/${encodeURIComponent(material.id)}/powerpoint`
            : null;

    return (
        <main className="min-h-screen bg-white">
            {/* HERO: Mobile xếp dọc; desktop chia 2 cột rõ ràng */}
            <section className="border-b border-violet-100 bg-[#F6F3FF] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 md:gap-9 lg:gap-12">

                    {/* Biểu tượng, tiêu đề, mô tả và thông tin tài liệu */}
                    <div className="flex w-full min-w-0 items-start gap-4 sm:gap-6">
                        {/* Biểu tượng tài liệu */}
                        <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-20 sm:w-20 ${format.iconClass}`}
                        >
                            <Icon
                                aria-hidden="true"
                                className="h-8 w-8 sm:h-11 sm:w-11"
                                strokeWidth={1.5}
                            />
                        </div>

                        {/* Nội dung tài liệu */}
                        <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${format.badgeClass}`}
                                >
                                    {format.label}
                                </span>

                                {material.collection && (
                                    <span className="max-w-full break-words rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-900">
                                        {material.collection}
                                    </span>
                                )}
                            </div>

                            {/* Tiêu đề */}
                            <h1 className="mt-3 break-words text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                                {material.title}
                            </h1>

                            {/* Mô tả */}
                            {material.description && (
                                <p className="mt-4 max-w-6xl whitespace-pre-line break-words text-sm leading-7 text-slate-600 sm:text-base">
                                    {material.description}
                                </p>
                            )}

                            {/* Thông tin tài liệu nằm ngay dưới mô tả */}
                            <aside
                                aria-labelledby="material-info-title"
                                className="mx-auto  mt-6 w-full max-w-4xl p-4 text-center"
                            >
                                {/* <h2
                                    id="material-info-title"
                                    className="text-base font-bold text-slate-900 sm:text-lg"
                                >
                                    Thông tin tài liệu
                                </h2> */}

                                <dl className="mt-5 grid grid-cols-1 justify-items-center gap-x-12 gap-y-5 text-center text-[16px] sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-16 xl:gap-x-20">
                                    <div>
                                        <dt className="whitespace-nowrap flex items-center justify-center gap-2 text-slate-500">
                                            <Languages className="h-4 w-4 shrink-0" />
                                            Ngôn ngữ
                                        </dt>
                                        <dd className="mt-1 text-center font-semibold text-slate-900">
                                            {languageName}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="flex items-center justify-center gap-2 text-slate-500">
                                            <GraduationCap className="h-4 w-4 shrink-0" />
                                            Trình độ
                                        </dt>
                                        <dd className="mt-1 text-center font-semibold text-slate-900">
                                            {material.level}
                                        </dd>
                                    </div>

                                    <div className="min-w-0">
                                        <dt className=" whitespace-nowrap flex items-center justify-center gap-2 text-slate-500">
                                            <BookOpen className="h-4 w-4 shrink-0" />
                                            Bộ tài liệu
                                        </dt>
                                        <dd className="mt-1 text-center font-semibold text-slate-900">
                                            {material.collection || "—"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="flex whitespace-nowrap  items-center justify-center gap-2 text-slate-500">
                                            <FileText className="h-4 w-4 shrink-0" />
                                            Định dạng
                                        </dt>
                                        <dd className="mt-1 text-center font-semibold text-slate-900">
                                            {format.label}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className=" flex items-center justify-center gap-2 text-slate-500">
                                            <CalendarDays className="h-4 w-4 shrink-0" />
                                            Cập nhật
                                        </dt>
                                        <dd className="mt-1 text-center font-semibold text-slate-900">
                                            <time dateTime={material.updatedAt}>
                                                {formatMaterialDate(material.updatedAt)}
                                            </time>
                                        </dd>
                                    </div>
                                </dl>



                            </aside>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trình xem tài liệu chiếm chiều rộng trang, không bị card thông tin chèn vào */}
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                {/* <Link
                    href={backUrl}
                    className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#5143EF] transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 sm:text-base"
                >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                    Quay về thư viện tài liệu
                </Link> */}


                {/* Xem trước tài liệu PDF / DOCX */}
                <section
                    aria-labelledby="material-preview-title"
                    className="mt-5 overflow-hidden"
                >
                    {/* Thanh tiêu đề */}
                    {/* <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 px-4 py-3 sm:px-6">
                        <h2
                            id="material-preview-title"
                            className="text-sm font-bold text-slate-900 sm:text-base"
                        >
                            Xem trước tài liệu
                        </h2>
                    </div> */}

                    {/* Nội dung xem trước */}
                    {isPdf && fileUrl ? (
                        // PDF: giữ nguyên trình xem hiện tại
                        <iframe
                            src={fileUrl}
                            title={`Xem trước: ${material.title}`}
                            className="h-[80dvh] min-h-[500px] w-full border-0 md:h-[100dvh] lg:h-[90dvh]"
                            loading="lazy"
                        />
                    ) : isDocx ? (
                        // DOCX: hiển thị nội dung Word
                        <DocxPreview materialId={material.id} />
                    ) : powerpointPreviewUrl ? (
                        // PowerPoint Preview: sử dụng bản PDF chuyển đổi
                        <iframe
                            src={powerpointPreviewUrl}
                            title={`Xem trước PowerPoint: ${material.title}`}
                            className="h-[80dvh] min-h-[500px] w-full border-0 md:h-[100dvh] lg:h-[110dvh]"
                            loading="lazy"
                        />
                    ) : (


                        // Không có file hoặc định dạng chưa hỗ trợ
                        <div className="flex min-h-[320px] flex-col items-center justify-center px-5 py-12 text-center sm:min-h-[400px]">
                            <div
                                className={`flex h-20 w-20 items-center justify-center rounded-2xl ${format.iconClass}`}
                            >
                                <Icon
                                    aria-hidden="true"
                                    className="h-11 w-11"
                                    strokeWidth={1.25}
                                />
                            </div>

                            <h3 className="mt-5 text-lg font-bold text-slate-900">
                                {fileUrl
                                    ? "Tải tài liệu để xem đầy đủ"
                                    : "Tài liệu đang được cập nhật"}
                            </h3>

                            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
                                {fileUrl
                                    ? `Bạn có thể mở file ${format.label} bằng ứng dụng phù hợp trên thiết bị.`
                                    : "File học tập sẽ được bổ sung sau."}
                            </p>

                            {/* Chỉ hiện nút mở khi có file */}
                            {fileUrl && (
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`mt-6 max-w-xs ${primaryButtonClass}`}
                                >
                                    <ExternalLink
                                        aria-hidden="true"
                                        className="h-4 w-4"
                                    />
                                    Mở tài liệu
                                </a>
                            )}
                        </div>
                    )}
                </section>



                {relatedMaterials.length > 0 && (
                    <RelatedMaterialsCarousel materials={relatedMaterials} />
                )}
            </div>
        </main>
    );
}

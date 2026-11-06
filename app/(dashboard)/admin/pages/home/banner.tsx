"use client";

import axios from "axios";
import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import Image from "next/image";
import {
    Check,
    Eye,
    Image as ImageIcon,
    Loader2,
    Save,
    X,
} from "lucide-react";

import { apiClient } from "@/lib/http";
import {
    heroContentSchema,
    type HeroContent,
} from "@/schema/home-content.schema";
import Hero from "@/app/(main)/home/hero";
import { defaultHeroContent } from "@/data/home-content";

type FieldErrors = Partial<Record<keyof HeroContent, string>>;

type ContentResponse = {
    success: boolean;
    message?: string;
    data?: {
        sections: {
            hero: HeroContent;
        };
        updatedAt: string | null;
    };
};

type TextField = {
    name: Exclude<keyof HeroContent, "enabled">;
    label: string;
    maxLength: number;
    placeholder?: string;
    multiline?: boolean;
};

const fields: TextField[] = [
    {
        name: "greeting",
        label: "Lời chào",
        maxLength: 100,
        placeholder: "🇫🇷 Bonjour l’ami!",
    },
    {
        name: "tagline",
        label: "Dòng giới thiệu nhỏ",
        maxLength: 150,
    },
    {
        name: "title",
        label: "Tiêu đề chính",
        maxLength: 200,
    },
    {
        name: "description",
        label: "Mô tả",
        maxLength: 1000,
        multiline: true,
    },
    {
        name: "imageUrl",
        label: "Đường dẫn ảnh",
        maxLength: 500,
        placeholder: "/images/hero-alice.png",
    },
    {
        name: "imageAlt",
        label: "Mô tả ảnh",
        maxLength: 200,
    },
    {
        name: "buttonLabel",
        label: "Chữ trên nút",
        maxLength: 60,
        placeholder: "Let’s go",
    },
    {
        name: "buttonHref",
        label: "Đường dẫn nút",
        maxLength: 500,
        placeholder: "/materials",
    },
];

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return (
            error.response?.data?.message ??
            "Không thể kết nối máy chủ. Vui lòng thử lại."
        );
    }

    return error instanceof Error
        ? error.message
        : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

export default function HomeContentForm() {
    const [formData, setFormData] = useState<HeroContent | null>(null);
    const [savedData, setSavedData] = useState<HeroContent | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState<
        string | null
    >(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const savingRef = useRef(false);
    const localImagePreviewUrlRef = useRef<string | null>(null);
    const previewTriggerRef = useRef<HTMLButtonElement>(null);

    //upload ảnh
    const [uploading, setUploading] = useState(false);
    const uploadingRef = useRef(false)

    useEffect(
        () => () => {
            if (localImagePreviewUrlRef.current) {
                URL.revokeObjectURL(localImagePreviewUrlRef.current);
            }
        },
        [],
    );

    useEffect(() => {
        if (!isPreviewOpen) {
            previewTriggerRef.current?.focus();
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsPreviewOpen(false);
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isPreviewOpen]);

    function clearLocalImagePreview() {
        if (localImagePreviewUrlRef.current) {
            URL.revokeObjectURL(localImagePreviewUrlRef.current);
            localImagePreviewUrlRef.current = null;
        }

        setLocalImagePreviewUrl(null);
    }

    useEffect(() => {
        const controller = new AbortController();

        async function loadContent() {
            setLoading(true);
            setError("");

            try {
                const response = await apiClient.get<ContentResponse>(
                    "/api/admin/pages/home",
                    { signal: controller.signal },
                );


                const payload = response.data;

                if (!payload.success || !payload.data) {
                    throw new Error(
                        payload.message ?? "Không thể tải nội dung trang chủ.",
                    );
                }

                const hero = heroContentSchema.parse(
                    payload.data.sections.hero,
                );

                if (!controller.signal.aborted) {
                    setFormData(hero);
                    setSavedData(hero);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(error));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadContent();

        return () => controller.abort();
    }, [reloadKey]);

    function updateField<K extends keyof HeroContent>(
        name: K,
        value: HeroContent[K],
    ) {
        if (name === "imageUrl") {
            clearLocalImagePreview();
        }

        setFormData((current) =>
            current ? { ...current, [name]: value } : current,
        );

        setFieldErrors((current) => ({
            ...current,
            [name]: undefined,
        }));

        setError("");
        setMessage("");
    }
    //[thêm] upload
    async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.currentTarget.files?.[0];

        // Cho phép chọn lại cùng một file.
        event.currentTarget.value = "";

        if (!file || uploadingRef.current || savingRef.current) return;

        clearLocalImagePreview();

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setMessage("");
            setError("Chỉ hỗ trợ ảnh JPG, PNG và WebP.");
            return;
        }

        if (file.size === 0 || file.size > 5 * 1024 * 1024) {
            setMessage("");
            setError("Ảnh không được rỗng và không được vượt quá 5 MB.");
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        localImagePreviewUrlRef.current = previewUrl;
        setLocalImagePreviewUrl(previewUrl);

        uploadingRef.current = true;
        setUploading(true);
        setError("");
        setMessage("");

        try {
            const body = new FormData();
            body.append("file", file);

            const response = await fetch("/api/uploads/images", {
                method: "POST",
                credentials: "same-origin",
                body,
            });

            const payload = (await response.json()) as {
                success?: boolean;
                message?: string;
                data?: { url?: string };
            };

            if (
                !response.ok ||
                !payload.success ||
                typeof payload.data?.url !== "string" ||
                !payload.data.url
            ) {
                throw new Error(payload.message ?? "Upload ảnh thất bại.");
            }

            updateField("imageUrl", payload.data.url);

            setMessage(
                "Đã upload ảnh. Bấm Lưu Banner để áp dụng lên website.",
            );
        } catch (error) {
            clearLocalImagePreview();
            setError(getErrorMessage(error));
        } finally {
            uploadingRef.current = false;
            setUploading(false);
        }
    }
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();



        if (!formData || savingRef.current) return;

        setError("");
        setMessage("");
        setFieldErrors({});

        const parsed = heroContentSchema.safeParse(formData);

        if (!parsed.success) {
            const errors: FieldErrors = {};

            for (const issue of parsed.error.issues) {
                const field = issue.path[0] as keyof HeroContent;

                if (field && !errors[field]) {
                    errors[field] = issue.message;
                }
            }

            setFieldErrors(errors);
            setError("Vui lòng kiểm tra các trường được đánh dấu.");
            return;
        }

        savingRef.current = true;
        setSaving(true);

        try {
            const response = await apiClient.patch<ContentResponse>(
                "/api/admin/pages/home",
                { hero: parsed.data },
            );

            const payload = response.data;

            if (!payload.success || !payload.data) {
                throw new Error(
                    payload.message ?? "Không thể lưu nội dung Banner.",
                );
            }

            const hero = heroContentSchema.parse(
                payload.data.sections.hero,
            );

            setFormData(hero);
            setSavedData(hero);
            setMessage(payload.message ?? "Đã lưu nội dung Banner.");
        } catch (error) {
            setError(getErrorMessage(error));
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    function resetChanges() {
        if (!savedData) return;

        setFormData({ ...savedData });
        setFieldErrors({});
        setError("");
        setMessage("");
    }

    if (loading) {
        return (
            <div
                role="status"
                className="flex items-center gap-3 rounded-2xl bg-white p-8 text-slate-500"
            >
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                Đang tải nội dung…
            </div>
        );
    }

    if (!formData) {
        return (
            <div className="rounded-2xl border border-red-100 bg-white p-6">
                <p role="alert" className="text-sm text-red-600">
                    {error || "Không thể tải nội dung."}
                </p>

                <button
                    type="button"
                    onClick={() => setReloadKey((value) => value + 1)}
                    className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                >
                    Thử lại
                </button>
            </div>
        );
    }


    // [thêm] dữ liệu bản xem trước 
    const hasChanges =
        JSON.stringify(formData) !== JSON.stringify(savedData);

    const previewSource = localImagePreviewUrl ?? formData.imageUrl;

    const hasUnsavedImageChange =
        formData.imageUrl !== savedData?.imageUrl;

    // Chỉ dùng đường dẫn ảnh nội bộ hoặc ảnh tạm vừa chọn.
    // Tránh lỗi Next/Image khi admin đang nhập đường dẫn chưa hoàn chỉnh.
    const imageSource = previewSource.trim();

    const isValidPreviewImage =
        imageSource.startsWith("blob:") ||
        (
            imageSource.startsWith("/") &&
            !imageSource.startsWith("//") &&
            !/[\\\s]/.test(imageSource)
        );

    const previewContent: HeroContent = {
        ...formData,
        imageUrl: isValidPreviewImage
            ? imageSource
            : defaultHeroContent.imageUrl,
    };
    return (
        <div className="space-y-8">
            <form
                onSubmit={handleSubmit}
                noValidate
                aria-busy={saving || uploading}
                className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8"
            >
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">
                        Banner đầu trang
                    </h2>

                </div>

                {error && (
                    <p
                        role="alert"
                        className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-600"
                    >
                        {error}
                    </p>
                )}

                {message && (
                    <p
                        role="status"
                        className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
                    >
                        {message}
                    </p>
                )}

                <fieldset disabled={saving || uploading} className="space-y-6">
                    <legend className="sr-only">Nội dung Banner</legend>

                    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={formData.enabled}
                            onChange={(event) =>
                                updateField("enabled", event.target.checked)
                            }
                            className="h-4 w-4 accent-violet-600"
                        />
                        Hiển thị Banner trên trang chủ
                    </label>

                    <div className="grid gap-5 md:grid-cols-2">
                        {fields.map((field) => {
                            const inputId = `hero-${field.name}`;
                            const errorId = `${inputId}-error`;
                            const fieldError = fieldErrors[field.name];

                            const className = [
                                "mt-2 w-full rounded-xl border px-4 py-3 text-sm",
                                "text-slate-900 placeholder:text-slate-400",
                                "focus:outline-none focus:ring-2 focus:ring-violet-200",
                                fieldError ? "border-red-400" : "border-slate-200",
                            ].join(" ");

                            return (
                                <div
                                    key={field.name}
                                    className={
                                        field.multiline || field.name === "title"
                                            ? "md:col-span-2"
                                            : ""
                                    }
                                >
                                    <label
                                        htmlFor={inputId}
                                        className="text-sm font-semibold text-slate-700"
                                    >
                                        {field.label}
                                    </label>

                                    {field.multiline ? (
                                        <textarea
                                            id={inputId}
                                            name={field.name}
                                            rows={4}
                                            value={formData[field.name]}
                                            maxLength={field.maxLength}
                                            onChange={(event) =>
                                                updateField(field.name, event.target.value)
                                            }
                                            aria-invalid={Boolean(fieldError)}
                                            aria-describedby={fieldError ? errorId : undefined}
                                            className={`${className} resize-y`}
                                        />
                                    ) : (
                                        <input
                                            id={inputId}
                                            name={field.name}
                                            type="text"
                                            value={formData[field.name]}
                                            maxLength={field.maxLength}
                                            placeholder={field.placeholder}
                                            onChange={(event) =>
                                                updateField(field.name, event.target.value)
                                            }
                                            aria-invalid={Boolean(fieldError)}
                                            aria-describedby={fieldError ? errorId : undefined}
                                            className={className}
                                        />
                                    )}

                                    {fieldError && (
                                        <p id={errorId} className="mt-2 text-xs text-red-600">
                                            {fieldError}
                                        </p>
                                    )}
                                    {field.name === "imageUrl" && (
                                        <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <label
                                                        htmlFor="hero-image-upload"
                                                        className="block text-sm font-semibold text-slate-800"
                                                    >
                                                        Tải lên hoặc thay đổi ảnh Banner
                                                    </label>
                                                    <p className="text-xs text-slate-500">
                                                        Hỗ trợ JPG, PNG, WebP - tối đa 5 MB.
                                                    </p>
                                                </div>

                                                {hasUnsavedImageChange && (
                                                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                        Chưa lưu Banner
                                                    </span>
                                                )}
                                            </div>

                                            {/* Khu vực nút chọn file tùy biến đẹp mắt */}
                                            <div className="flex flex-wrap items-center gap-3">
                                                <label
                                                    htmlFor="hero-image-upload"
                                                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                                                >
                                                    <ImageIcon aria-hidden="true" className="h-4 w-4" />
                                                    Chọn ảnh từ máy tính
                                                </label>
                                                <input
                                                    id="hero-image-upload"
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={handleImageUpload}
                                                    disabled={saving || uploading}
                                                    className="sr-only" // Ẩn input mặc định đi để dùng label tùy biến ở trên
                                                />

                                                {uploading && (
                                                    <span role="status" className="inline-flex items-center gap-2 text-sm font-medium text-violet-700">
                                                        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                                                        Đang upload ảnh…
                                                    </span>
                                                )}
                                            </div>

                                            {/* BỐ CỤC MỚI: Khung hiển thị ảnh xem trước rộng rãi và trực quan hơn */}
                                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">


                                                <div className="relative aspect-[16/9] w-full bg-slate-900/5 sm:aspect-[21/9]">
                                                    {previewSource ? (
                                                        <Image
                                                            key={previewSource}
                                                            src={previewSource}
                                                            alt={formData.imageAlt || "Ảnh xem trước Banner"}
                                                            fill
                                                            unoptimized
                                                            className="object-cover"
                                                            sizes="(max-width: 768px) 100vw, 800px"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                                                            <ImageIcon aria-hidden="true" className="h-10 w-10 stroke-1" />
                                                            <span className="text-sm font-medium">
                                                                Chưa có ảnh xem trước
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {localImagePreviewUrl && (
                                                    <div className="bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800 border-t border-amber-100">
                                                        ⚠️ Ảnh tạm thời đang hiển thị. Hãy bấm nút <strong>Lưu Banner</strong> ở dưới cùng để áp dụng chính thức lên website.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
                        <button
                            type="button"
                            onClick={resetChanges}
                            disabled={!hasChanges || saving || uploading}
                            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Hoàn tác thay đổi
                        </button>

                        <button
                            type="submit"
                            disabled={!hasChanges || saving || uploading}
                            aria-busy={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#5143EF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4435DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2
                                    aria-hidden="true"
                                    className="h-4 w-4 animate-spin"
                                />
                            ) : hasChanges ? (
                                <Save aria-hidden="true" className="h-4 w-4" />
                            ) : (
                                <Check aria-hidden="true" className="h-4 w-4" />
                            )}

                            {saving
                                ? "Đang lưu…"
                                : hasChanges
                                    ? "Lưu Banner"
                                    : "Đã lưu"}
                        </button>

                        <button
                            ref={previewTriggerRef}
                            type="button"
                            onClick={() => setIsPreviewOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                        >
                            <Eye aria-hidden="true" className="h-4 w-4" />
                            Xem trước
                        </button>

                    </div>
                </fieldset>
            </form>




            {/* <span
                        className={
                            hasChanges || uploading
                                ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                                : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        }
                    >
                        {uploading
                            ? "Đang upload ảnh"
                            : hasChanges
                                ? "Có thay đổi chưa lưu"
                                : "Nội dung đã lưu"}
                    </span> */}


            {isPreviewOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsPreviewOpen(false);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="hero-preview-heading"
                        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                    >
                        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">


                            <button
                                type="button"
                                autoFocus
                                onClick={() => setIsPreviewOpen(false)}
                                aria-label="Đóng bản xem trước"
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                            >
                                <X aria-hidden="true" className="h-5 w-5" />
                            </button>
                        </header>

                        <div className="overflow-y-auto">
                            {!formData.enabled && (
                                <p className="px-5 py-8 text-sm text-slate-500">
                                    Banner đang được tắt nên sẽ không hiển thị trên website.
                                </p>
                            )}

                            <div inert>
                                <Hero content={previewContent} />
                            </div>

                            {!isValidPreviewImage && formData.enabled && (
                                <p className="border-t border-slate-200 px-5 py-3 text-xs text-amber-700">
                                    Đường dẫn ảnh chưa hợp lệ. Bản xem trước đang dùng ảnh mặc định.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
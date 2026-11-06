"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { apiClient } from "@/lib/http";

import {
    introContentSchema,
    type IntroContent,
} from "@/schema/intro-content.schema";

type IntroContentProps = {
    initialContent: IntroContent;
    onSave: (content: IntroContent) => Promise<IntroContent>;
};

type HomeResponse = {
    success: boolean;
    message?: string;
    data?: {
        sections: {
            intro: IntroContent;
        };
    };
};

export default function IntroTab() {
    const [content, setContent] = useState<IntroContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        async function loadContent() {
            setLoading(true);
            setLoadError("");

            try {
                const response = await apiClient.get<HomeResponse>(
                    "/api/admin/pages/home",
                    { signal: controller.signal },
                );

                const payload = response.data;

                if (!payload.success || !payload.data) {
                    throw new Error(
                        payload.message ?? "Không thể tải nội dung Intro.",
                    );
                }

                const intro = introContentSchema.parse(
                    payload.data.sections.intro,
                );

                if (!controller.signal.aborted) {
                    setContent(intro);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setLoadError(errorMessage(error));
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

    async function saveIntro(
        intro: IntroContent,
    ): Promise<IntroContent> {
        const response = await apiClient.patch<HomeResponse>(
            "/api/admin/pages/home",
            { intro },
        );

        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(
                payload.message ?? "Không thể lưu dải ảnh.",
            );
        }

        return introContentSchema.parse(
            payload.data.sections.intro,
        );
    }

    if (loading) {
        return (
            <p role="status" className="rounded-2xl bg-white p-6 text-slate-500">
                Đang tải dải ảnh…
            </p>
        );
    }

    if (!content) {
        return (
            <div className="rounded-2xl bg-white p-6">
                <p role="alert" className="text-sm text-red-600">
                    {loadError || "Không thể tải nội dung Intro."}
                </p>

                <button
                    type="button"
                    onClick={() => setReloadKey((value) => value + 1)}
                    className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    return (
        <IntroContentForm
            initialContent={content}
            onSave={saveIntro}
        />
    );
}

const MAX_IMAGES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function errorMessage(error: unknown) {
    return error instanceof Error
        ? error.message
        : "Thao tác thất bại. Vui lòng thử lại.";
}

function IntroContentForm({
    initialContent,
    onSave,
}: IntroContentProps) {
    const [content, setContent] = useState(initialContent);
    const [savedContent, setSavedContent] = useState(initialContent);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const busyRef = useRef(false);

    const busy = saving || uploadingId !== null;
    const hasChanges =
        JSON.stringify(content) !== JSON.stringify(savedContent);

    function clearMessages() {
        setError("");
        setMessage("");
    }

    async function uploadImage(
        event: ChangeEvent<HTMLInputElement>,
        imageId?: string,
    ) {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";

        if (!file || busyRef.current) return;

        clearMessages();

        if (!imageId && content.images.length >= MAX_IMAGES) {
            setError(`Chỉ được thêm tối đa ${MAX_IMAGES} ảnh.`);
            return;
        }

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setError("Chỉ hỗ trợ JPG, PNG và WebP.");
            return;
        }

        if (file.size === 0 || file.size > MAX_FILE_SIZE) {
            setError("Ảnh không được rỗng hoặc vượt quá 5 MB.");
            return;
        }

        busyRef.current = true;
        setUploadingId(imageId ?? "new");

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

            const url = payload.data?.url;

            if (!response.ok || !payload.success || !url) {
                throw new Error(payload.message ?? "Upload ảnh thất bại.");
            }

            const newId = crypto.randomUUID();

            setContent((current) => ({
                ...current,
                images: imageId
                    ? current.images.map((image) =>
                        image.id === imageId
                            ? { ...image, imageUrl: url }
                            : image,
                    )
                    : [
                        ...current.images,
                        {
                            id: newId,
                            imageUrl: url,
                            imageAlt: "",
                        },
                    ],
            }));

            setMessage("Đã upload ảnh. Bấm Lưu để áp dụng lên website.");
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            busyRef.current = false;
            setUploadingId(null);
        }
    }

    function updateAlt(id: string, value: string) {
        clearMessages();

        setContent((current) => ({
            ...current,
            images: current.images.map((image) =>
                image.id === id ? { ...image, imageAlt: value } : image,
            ),
        }));
    }

    function removeImage(id: string) {
        if (busyRef.current) return;

        clearMessages();

        setContent((current) => ({
            ...current,
            images: current.images.filter((image) => image.id !== id),
        }));
    }

    async function saveContent() {
        if (busyRef.current || !hasChanges) return;

        clearMessages();

        if (content.enabled && content.images.length === 0) {
            setError("Thêm ít nhất một ảnh trước khi bật phần này.");
            return;
        }

        if (content.images.some((image) => !image.imageAlt.trim())) {
            setError("Vui lòng nhập mô tả cho mỗi ảnh.");
            return;
        }

        busyRef.current = true;
        setSaving(true);

        try {
            const data: IntroContent = {
                enabled: content.enabled,
                images: content.images.map((image) => ({
                    ...image,
                    imageAlt: image.imageAlt.trim(),
                })),
            };

            const saved = await onSave(data);

            setContent(saved);
            setSavedContent(saved);
            setMessage("Đã lưu danh sách ảnh.");
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            busyRef.current = false;
            setSaving(false);
        }
    }

    function resetChanges() {
        if (busyRef.current) return;

        setContent(savedContent);
        clearMessages();
    }

    return (
        <section
            aria-labelledby="intro-content-title"
            aria-busy={busy}
            className="rounded-3xl p-5 "
        >



            {error && (
                <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    {error}
                </p>
            )}

            {message && (
                <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    {message}
                </p>
            )}

            <fieldset disabled={busy} className="-mt-3 space-y-6">
                <legend className="sr-only">Quản lý dải ảnh</legend>

                <label className="flex items-start gap-3 cursor-pointer text-sm font-semibold text-slate-700">
                    <input
                        type="checkbox"
                        checked={content.enabled}
                        onChange={(event) => {
                            const enabled = event.target.checked;
                            clearMessages();
                            setContent((current) => ({ ...current, enabled }));
                        }}
                        className="mt-0.5 h-4 w-4 accent-violet-600"
                    />
                    <div className="flex flex-col">
                        <span>Hiển thị dải ảnh trên trang chủ</span>
                        <span className="mt-2 text-[12px] font-normal text-slate-500">
                            JPG, PNG hoặc WebP (tối đa 5 MB mỗi ảnh)
                        </span>
                    </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {content.images.map((image, index) => (
                        <article
                            key={image.id}
                            className="rounded-2xl border border-violet-100 bg-[#F6F3FF] p-4"
                        >
                            <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl bg-white p-3">
                                {/* img dùng cho ảnh preview từ endpoint upload. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={image.imageUrl}
                                    alt={image.imageAlt || `Ảnh ${index + 1}`}
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>

                            <label
                                htmlFor={`intro-alt-${image.id}`}
                                className="mt-4 block text-sm font-semibold text-slate-700"
                            >
                                Mô tả ảnh {index + 1}
                            </label>

                            <input
                                id={`intro-alt-${image.id}`}
                                type="text"
                                value={image.imageAlt}
                                maxLength={200}
                                placeholder="Ví dụ: Logo trung tâm Alice"
                                onChange={(event) => updateAlt(image.id, event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                            />

                            <div className="mt-4 flex items-center justify-between gap-3">
                                <label className="relative cursor-pointer rounded-lg bg-white px-3 py-2 text-sm font-semibold text-violet-700 focus-within:ring-2 focus-within:ring-violet-400">
                                    Thay ảnh
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        aria-label={`Thay ảnh ${index + 1}`}
                                        onChange={(event) => void uploadImage(event, image.id)}
                                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={() => removeImage(image.id)}
                                    aria-label={`Xóa ảnh ${index + 1} khỏi danh sách`}
                                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>

                {content.images.length < MAX_IMAGES && (
                    <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 focus-within:ring-2 focus-within:ring-violet-400">
                        <ImagePlus aria-hidden="true" className="h-4 w-4" />
                        Thêm ảnh
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            aria-label="Thêm ảnh vào dải ảnh"
                            onChange={(event) => void uploadImage(event)}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                    </label>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                    <button
                        type="button"
                        onClick={resetChanges}
                        disabled={!hasChanges || busy}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    >
                        Hoàn tác
                    </button>

                    <button
                        type="button"
                        onClick={() => void saveContent()}
                        disabled={!hasChanges || busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#5143EF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save aria-hidden="true" className="h-4 w-4" />
                        )}
                        {saving ? "Đang lưu…" : "Lưu dải ảnh"}
                    </button>
                </div>
            </fieldset>

            {uploadingId && (
                <p role="status" className="mt-4 flex items-center gap-2 text-sm text-violet-700">
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    Đang upload ảnh…
                </p>
            )}
        </section>
    );
}

"use client";

import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
} from "react";
import { Plus, Search, X } from "lucide-react";
import type { FlashcardRow } from "@/lib/flashcards/types";
import {
    MODE_KEYS,
    type FlashcardPayload,
} from "@/lib/flashcards/validation";

const MODE_LABELS: Record<string, string> = {
    flashcards: "Flashcards",
    learn: "Learn",
    test: "Test",
    match: "Match",
    spell: "Spell (cần kiểm thử)",
};

function empty(): FlashcardPayload {
    return {
        slug: "",
        title: "",
        description: "",
        language: "en",
        level: "A1",
        quizletUrl: "",
        status: "draft",
        sortOrder: 0,
        modes: {
            flashcards: { enabled: true, embedUrl: "" },
            learn: { enabled: false, embedUrl: "" },
            test: { enabled: false, embedUrl: "" },
            match: { enabled: false, embedUrl: "" },
            spell: { enabled: false, embedUrl: "" },
        },
    };
}

const input =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

export default function FlashcardAdmin() {
    // Dữ liệu bảng và form
    const [rows, setRows] = useState<FlashcardRow[]>([]);
    const [form, setForm] = useState<FlashcardPayload>(empty);
    const [editing, setEditing] = useState<string | null>(null);

    // Trạng thái dialog
    const [dialogOpen, setDialogOpen] = useState(false);

    // Trạng thái API
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [search, setSearch] = useState("");


    // ============================================
    // TẢI DANH SÁCH FLASHCARD TỪ MONGODB
    // ============================================

    // Hàm dùng để làm mới danh sách sau khi thêm, sửa, xóa.
    const load = useCallback(async () => {
        setLoading(true);

        try {
            const res = await fetch("/api/admin/flashcards", {
                cache: "no-store",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error || "Không tải được danh sách bộ thẻ",
                );
            }

            setRows(data);
            setError("");
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Không thể tải dữ liệu",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Tải dữ liệu lần đầu khi component được mount.
    useEffect(() => {
        const controller = new AbortController();

        async function loadInitialData() {
            try {
                const res = await fetch("/api/admin/flashcards", {
                    cache: "no-store",
                    signal: controller.signal,
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(
                        data.error || "Không tải được danh sách bộ thẻ",
                    );
                }

                // Chỉ cập nhật khi request chưa bị hủy.
                if (!controller.signal.aborted) {
                    setRows(data);
                    setError("");
                }
            } catch (e) {
                if (controller.signal.aborted) return;

                setError(
                    e instanceof Error
                        ? e.message
                        : "Không thể tải dữ liệu",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadInitialData();

        // Hủy request khi component unmount.
        return () => controller.abort();
    }, []);


    // Khóa cuộn trang khi dialog mở
    useEffect(() => {
        if (!dialogOpen) return;

        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = oldOverflow;
        };
    }, [dialogOpen]);

    // Mở dialog thêm mới
    function create() {
        setEditing(null);
        setForm(empty());
        setFormError("");
        setDialogOpen(true);
    }

    // Mở dialog chỉnh sửa
    function edit(row: FlashcardRow) {
        setEditing(row._id);

        setForm({
            slug: row.slug,
            title: row.title,
            description: row.description,
            language: row.language,
            level: row.level,
            quizletUrl: row.quizletUrl,
            status: row.status,
            sortOrder: row.sortOrder,
            modes: structuredClone(row.modes),
        });

        setFormError("");
        setDialogOpen(true);
    }

    // Đóng dialog
    function closeDialog() {
        if (busy) return;

        setDialogOpen(false);
        setEditing(null);
        setForm(empty());
        setFormError("");
    }

    // Lưu dữ liệu thêm hoặc sửa
    async function save(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setFormError("");

        try {
            const res = await fetch(
                editing
                    ? `/api/admin/flashcards/${editing}`
                    : "/api/admin/flashcards",
                {
                    method: editing ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(form),
                },
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Không lưu được");
            }

            // Lưu thành công: đóng dialog và tải lại bảng
            setDialogOpen(false);
            setEditing(null);
            setForm(empty());

            await load();
        } catch (e) {
            setFormError(
                e instanceof Error ? e.message : "Không lưu được",
            );
        } finally {
            setBusy(false);
        }
    }

    // Xóa bộ thẻ
    async function remove(row: FlashcardRow) {
        if (!window.confirm(`Xóa bộ thẻ “${row.title}”?`)) {
            return;
        }

        setBusy(true);
        setError("");

        try {
            const res = await fetch(
                `/api/admin/flashcards/${row._id}`,
                { method: "DELETE" },
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Không xóa được");
            }

            await load();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Không xóa được",
            );
        } finally {
            setBusy(false);
        }
    }

    // Lọc danh sách
    const filtered = rows.filter((row) =>
        [row.title, row.description, row.slug].some((value) =>
            value.toLowerCase().includes(search.trim().toLowerCase()),
        ),
    );

    return (
        <main className="mx-auto max-w-7xl space-y-5 p-5">
            {/* ===================================== */}
            {/* HEADER */}
            {/* ===================================== */}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Quản lý Flashcard
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Quản lý bộ thẻ và các chế độ nhúng Quizlet
                    </p>
                </div>

                <button
                    type="button"
                    onClick={create}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                    <Plus className="h-4 w-4" />
                    Thêm bộ thẻ
                </button>
            </div>

            {error && (
                <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            {/* ===================================== */}
            {/* BẢNG DANH SÁCH BỘ THẺ */}
            {/* ===================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-bold text-slate-900">
                        Danh sách bộ thẻ ({rows.length})
                    </h2>

                    <div className="relative w-full max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            aria-label="Tìm kiếm bộ thẻ"
                            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
                            placeholder="Tìm bộ thẻ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                                <th className="py-3 pr-3">Bộ thẻ</th>
                                <th className="pr-3">Ngôn ngữ</th>
                                <th className="pr-3">Chế độ học</th>
                                <th className="pr-3">Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>

                        <tbody>
                            {!loading &&
                                filtered.map((row) => (
                                    <tr
                                        key={row._id}
                                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                                    >
                                        <td className="py-4 pr-3 font-medium text-slate-900">
                                            {row.title}

                                            <p className="mt-0.5 text-xs font-normal text-slate-400">
                                                {row.slug}
                                            </p>
                                        </td>

                                        <td className="pr-3">
                                            {row.language === "en"
                                                ? "Tiếng Anh"
                                                : "Tiếng Pháp"}
                                        </td>

                                        <td className="pr-3 text-slate-600">
                                            {MODE_KEYS.filter(
                                                (key) => row.modes?.[key]?.enabled,
                                            )
                                                .map((key) => MODE_LABELS[key])
                                                .join(", ") || "—"}
                                        </td>

                                        <td className="pr-3">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "published"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-amber-50 text-amber-700"
                                                    }`}
                                            >
                                                {row.status === "published"
                                                    ? "Xuất bản"
                                                    : "Bản nháp"}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                className="mr-3 font-medium text-violet-700 hover:underline"
                                                onClick={() => edit(row)}
                                            >
                                                Sửa
                                            </button>

                                            <button
                                                type="button"
                                                disabled={busy}
                                                className="font-medium text-red-600 hover:underline disabled:opacity-50"
                                                onClick={() => void remove(row)}
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>

                    {loading && (
                        <p className="py-8 text-center text-sm text-slate-500">
                            Đang tải...
                        </p>
                    )}

                    {!loading && filtered.length === 0 && (
                        <p className="py-8 text-center text-sm text-slate-500">
                            Chưa có bộ thẻ phù hợp
                        </p>
                    )}
                </div>
            </section>

            {/* ===================================== */}
            {/* DIALOG THÊM / CHỈNH SỬA */}
            {/* ===================================== */}

            {dialogOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-6"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            closeDialog();
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="flashcard-dialog-title"
                        className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        {/* Header dialog */}

                        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                            <div>
                                {/* <h2
                  id="flashcard-dialog-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editing
                    ? "Chỉnh sửa bộ thẻ"
                    : "Thêm bộ thẻ mới"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Thông tin bộ thẻ và cấu hình chế độ học
                </p> */}
                            </div>

                            <button
                                type="button"
                                aria-label="Đóng dialog"
                                onClick={closeDialog}
                                disabled={busy}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={save}
                            className="flex min-h-0 flex-1 flex-col"
                        >
                            {/* Nội dung dialog cuộn độc lập */}

                            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                                {formError && (
                                    <p
                                        role="alert"
                                        className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                                    >
                                        {formError}
                                    </p>
                                )}

                                <div className="grid gap-6 lg:grid-cols-2">
                                    {/* ============================ */}
                                    {/* CỘT TRÁI: THÔNG TIN BỘ THẺ */}
                                    {/* ============================ */}

                                    <section className="space-y-4 lg:border-r lg:border-slate-200 lg:pr-6">
                                        <div>
                                            <h3 className="font-bold text-slate-900">
                                                Thông tin bộ thẻ
                                            </h3>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Nội dung hiển thị trong danh sách Flashcards
                                            </p>
                                        </div>

                                        <label className="block text-sm font-medium text-slate-700">
                                            Tên bộ thẻ
                                            <input
                                                required
                                                maxLength={180}
                                                className={input}
                                                value={form.title}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        title: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>

                                        <label className="block text-sm font-medium text-slate-700">
                                            Slug
                                            <input
                                                required
                                                className={input}
                                                placeholder="toeic-lesson-20"
                                                value={form.slug}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        slug: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>

                                        <label className="block text-sm font-medium text-slate-700">
                                            Mô tả
                                            <textarea
                                                rows={3}
                                                className={input}
                                                value={form.description}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        description: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>

                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Ngôn ngữ
                                                <select
                                                    className={input}
                                                    value={form.language}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            language: e.target.value as
                                                                | "en"
                                                                | "fr",
                                                        })
                                                    }
                                                >
                                                    <option value="en">Tiếng Anh</option>
                                                    <option value="fr">Tiếng Pháp</option>
                                                </select>
                                            </label>

                                            <label className="block text-sm font-medium text-slate-700">
                                                Trình độ
                                                <input
                                                    className={input}
                                                    value={form.level}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            level: e.target.value,
                                                        })
                                                    }
                                                />
                                            </label>
                                        </div>

                                        <label className="block text-sm font-medium text-slate-700">
                                            Link bộ thẻ Quizlet
                                            <input
                                                required
                                                type="url"
                                                className={input}
                                                placeholder="https://quizlet.com/..."
                                                value={form.quizletUrl}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        quizletUrl: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>

                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Trạng thái
                                                <select
                                                    className={input}
                                                    value={form.status}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            status: e.target.value as
                                                                | "draft"
                                                                | "published",
                                                        })
                                                    }
                                                >
                                                    <option value="draft">Bản nháp</option>
                                                    <option value="published">Xuất bản</option>
                                                </select>
                                            </label>

                                            <label className="block text-sm font-medium text-slate-700">
                                                Thứ tự
                                                <input
                                                    type="number"
                                                    className={input}
                                                    value={form.sortOrder}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            sortOrder: Number(e.target.value),
                                                        })
                                                    }
                                                />
                                            </label>
                                        </div>
                                    </section>

                                    {/* ============================ */}
                                    {/* CỘT PHẢI: CHẾ ĐỘ HỌC */}
                                    {/* ============================ */}

                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="font-bold text-slate-900">
                                                Chế độ học Quizlet
                                            </h3>

                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Dán URL src của iframe Quizlet. Chỉ bật
                                                chế độ đã có mã nhúng hoạt động.
                                            </p>
                                        </div>

                                        {MODE_KEYS.map((key) => (
                                            <div
                                                key={key}
                                                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
                                            >
                                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                                    <input
                                                        type="checkbox"
                                                        disabled={key === "flashcards"}
                                                        checked={form.modes[key].enabled}
                                                        className="h-4 w-4 accent-violet-600"
                                                        onChange={(e) =>
                                                            setForm({
                                                                ...form,
                                                                modes: {
                                                                    ...form.modes,
                                                                    [key]: {
                                                                        ...form.modes[key],
                                                                        enabled: e.target.checked,
                                                                    },
                                                                },
                                                            })
                                                        }
                                                    />

                                                    {MODE_LABELS[key]}

                                                    {key === "flashcards" && (
                                                        <span className="ml-auto text-xs font-normal text-violet-600">
                                                            Mặc định
                                                        </span>
                                                    )}
                                                </label>

                                                <input
                                                    type="url"
                                                    className={input}
                                                    placeholder="https://quizlet.com/.../embed"
                                                    value={form.modes[key].embedUrl}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            modes: {
                                                                ...form.modes,
                                                                [key]: {
                                                                    ...form.modes[key],
                                                                    embedUrl: e.target.value,
                                                                },
                                                            },
                                                        })
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </section>
                                </div>
                            </div>

                            {/* Footer dialog luôn nằm phía dưới */}

                            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={closeDialog}
                                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>

                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                                >
                                    {busy
                                        ? "Đang lưu..."
                                        : editing
                                            ? "Lưu thay đổi"
                                            : "Thêm bộ thẻ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}

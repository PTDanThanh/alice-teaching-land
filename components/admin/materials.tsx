"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FileText,
    Presentation,
    Search,
    Trash2,
    RotateCcw,
    Plus,
    X,
    FilePenLine, CircleCheck,
    Save,
    Send
} from "lucide-react";
import type {
    Material,
    MaterialFormat,
    MaterialStatus,
    MaterialTypeFilter,
} from "@/data/materials";
import { normalizeMaterialText } from "@/data/materials";
import Pagination from "@/components/ui/pagination";
import MaterialUploadProgress from "@/components/admin/material-upload-progress";

type Row = Material;
type Status = MaterialStatus;

type MaterialsAdminProps = {
    mode?: "home" | "library" | "all";
};

const PAGE_SIZE = 10;

const typeLabels: Record<MaterialFormat, string> = {
    word: "Word",
    pdf: "PDF",
    powerpoint: "PowerPoint",
};

const langLabels: Record<Row["language"], string> = {
    en: "Tiếng Anh",
    fr: "Tiếng Pháp",
};

const statusLabels: Record<Status, string> = {
    published: "Xuất bản",
    draft: "Bản nháp",
};

const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

// Dữ liệu ban đầu cho modal thêm tài liệu.
const emptyForm = (): Row => ({
    id: `new-${Date.now()}`,
    title: "",
    description: "",
    collection: "",
    level: "A1",
    type: "pdf",
    language: "en",
    downloadUrl: null,
    updatedAt: new Date().toISOString(),
    status: "draft",
    showOnHome: false,
});

// Đọc thông báo lỗi từ API, không giả định mọi response đều là JSON hợp lệ.
async function getApiError(response: Response): Promise<string> {
    try {
        const body: unknown = await response.json();
        if (body && typeof body === "object" && "error" in body) {
            const message = (body as { error?: unknown }).error;
            if (typeof message === "string") return message;
        }
    } catch {
        // Giữ thông báo mặc định nếu API không trả JSON.
    }
    return `Yêu cầu thất bại (HTTP ${response.status})`;
}

// Xác định loại tài liệu dựa trên phần mở rộng
function getMaterialTypeFromFile(
    file: File
): MaterialFormat {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "pdf") return "pdf";

    if (extension === "doc" || extension === "docx") {
        return "word";
    }

    if (extension === "ppt" || extension === "pptx") {
        return "powerpoint";
    }

    throw new Error("Định dạng tài liệu không được hỗ trợ.");
}

//hàm chờ file verified key
type UploadPhase =
    | "creating"
    | "uploading"
    | "confirming"
    | "scan_pending"
    | "scanning"
    | "promotion_pending"
    | "promoting"
    | "ready"
    | "infected"
    | "failed"
    | "expired"
    | "cleanup"
    | "attached";

type UploadStatus = {
    success: boolean;
    data?: {
        phase: UploadPhase;
        ready: boolean;
        key: string | null;
    };
};
const VERIFIED_KEY_PATTERN =
    /^materials\/verified\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx|ppt|pptx)$/i;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

//POlling trang thái thực tế từ MongoDB
//không tự giả lập phần trăm quét virus
async function waitForVerifiedUpload(
    uploadId: string,
    onPhaseChange: (phase: UploadPhase) => void
): Promise<string> {
    const deadline = Date.now() + 5 * 60 * 1000; // 5 phút

    while (Date.now() < deadline) {
        const response = await fetch(
            `/api/admin/materials/upload/status/${encodeURIComponent(uploadId)}`,
            { cache: "no-store" }
        );
        if (!response.ok) {
            throw new Error("Không đọc được trạng thái upload từ server.");
        }

        const result = await response.json() as UploadStatus;
        const data = result.data;

        if (!result.success || !data) {
            throw new Error("Không đọc được trang thái fille upload từ server.");
        }
        onPhaseChange(data.phase);
        // Chỉ sử dụng verified key do backend xác nhận.
        if (data.ready) {
            if (!data.key || !VERIFIED_KEY_PATTERN.test(data.key)) {
                throw new Error("Verified key không hợp lệ.");
            }

            return data.key;
        }

        if (
            ["infected", "failed", "expired", "cleanup", "attached"].includes(
                data.phase
            )
        ) {
            throw new Error(
                `File không thể tiếp tục xử lý: ${data.phase}`
            );
        }

        await sleep(3000);
    }

    throw new Error(
        "Hết thời gian chờ. File có thể vẫn đang xử lý; hãy kiểm tra bảng tiến độ."
    );
}

async function uploadMaterialFile(file: File, onPhaseChange: (phase: UploadPhase) => void, onCreated: (uploadId: string) => void): Promise<string> {
    // Bước 1: Yêu cầu backend tạo phiên upload và Presigned URL
    const response = await fetch("/api/admin/materials/upload", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
        }),
    });

    if (!response.ok) {
        throw new Error(await getApiError(response));
    }

    const result = await response.json();

    const { uploadId, uploadUrl, contentType } = result.data;
    //thông báo cho bảng progress có phiên upload mới
    onCreated(uploadId);
    onPhaseChange("uploading");

    // Bước 2: Upload trực tiếp lên Cloudflare R2
    const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": contentType,
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        throw new Error("Không thể upload file lên Cloudflare R2.");
    }

    onPhaseChange("confirming");
    // Bước 3: Yêu cầu backend xác nhận file đã upload
    const confirmResponse = await fetch(
        "/api/admin/materials/upload/confirm",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                uploadId,
            }),
        }
    );

    if (!confirmResponse.ok) {
        throw new Error(await getApiError(confirmResponse));
    }

    const confirmed = await confirmResponse.json();

    // Trả về object key đã được backend xác nhận
    if (
        !confirmed.success ||
        typeof confirmed.data?.key !== "string"
    ) {
        throw new Error("Không nhận được khóa file đã xác nhận.");
    }

    return await waitForVerifiedUpload(uploadId, onPhaseChange);
}



export default function MaterialsAdmin({
    mode = "library",
}: MaterialsAdminProps) {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // BƯỚC 11E.7 - Theo dõi trạng thái upload
    const [uploadPhase, setUploadPhase] =
        useState<UploadPhase | null>(null);

    const [uploadProgressOpen, setUploadProgressOpen] = useState(false);

    // Làm mới bảng tiến độ upload
    const [uploadRefreshKey, setUploadRefreshKey] =
        useState(0);

    // Lưu file được chọn trước khi upload
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [language, setLanguage] = useState("all");
    const [typeFilter, setTypeFilter] =
        useState<MaterialTypeFilter>("all");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(1);

    const [editing, setEditing] = useState<Row | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deleting, setDeleting] = useState<Row | null>(null);

    const isHomeMode = mode === "home";

    useEffect(() => {
        if (!uploadProgressOpen) return;

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setUploadProgressOpen(false);
        }

        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [uploadProgressOpen]);

    // Cả hai trang Admin cùng lấy dữ liệu từ MongoDB qua một API.
    const loadMaterials = useCallback(async () => {
        const response = await fetch("/api/admin/materials", {
            cache: "no-store",
        });

        if (!response.ok) throw new Error(await getApiError(response));

        const data: unknown = await response.json();
        // API hiện tại trả trực tiếp mảng; hỗ trợ cả { materials: [...] }.
        const items = Array.isArray(data)
            ? data
            : data && typeof data === "object" && "materials" in data
                ? (data as { materials: unknown }).materials
                : null;

        if (!Array.isArray(items)) {
            throw new Error("Dữ liệu API không đúng định dạng danh sách tài liệu.");
        }

        setRows(items as Row[]);
    }, []);

    useEffect(() => {
        let active = true;

        async function initialize() {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch("/api/admin/materials", {
                    cache: "no-store",
                });
                if (!response.ok) throw new Error(await getApiError(response));
                const data: unknown = await response.json();
                const items = Array.isArray(data)
                    ? data
                    : data && typeof data === "object" && "materials" in data
                        ? (data as { materials: unknown }).materials
                        : null;
                if (!Array.isArray(items)) throw new Error("Dữ liệu API không hợp lệ.");
                if (active) setRows(items as Row[]);
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : "Không tải được tài liệu.");
            } finally {
                if (active) setLoading(false);
            }
        }

        void initialize();
        return () => {
            active = false;
        };
    }, []);

    const filtered = useMemo(() => {
        return rows
            .filter((item) => {
                const day = item.updatedAt.slice(0, 10);
                return (
                    normalizeMaterialText(item.title).includes(normalizeMaterialText(search)) &&
                    (!from || day >= from) &&
                    (!to || day <= to) &&
                    (language === "all" || item.language === language) &&
                    (typeFilter === "all" || item.type === typeFilter) &&
                    (status === "all" || item.status === status)
                );
            })
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }, [rows, search, from, to, language, typeFilter, status]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const visible = filtered.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE,
    );

    function resetPage() {
        setPage(1);
    }

    function resetFilters() {
        setSearch("");
        setFrom("");
        setTo("");
        setLanguage("all");
        setTypeFilter("all");
        setStatus("all");
        resetPage();
    }


    // =====================================================
    // BƯỚC 11E.7 - LƯU TÀI LIỆU SAU KHI FILE VERIFIED
    // =====================================================

    async function save() {
        // Không lưu khi form không hợp lệ hoặc đang xử lý.
        if (!editing || !editing.title.trim() || saving) return;

        try {
            setSaving(true);
            setError(null);

            // 1. Giữ file cũ nếu Admin không chọn file mới.
            let downloadUrl = editing.downloadUrl;

            // 2. Nếu chọn file mới, thực hiện:
            // Tạo phiên -> Upload R2 -> Confirm
            // -> Scan ClamAV -> Promotion -> Verified.
            if (selectedFile) {
                setUploadPhase("creating");
                setUploadProgressOpen(true);

                downloadUrl = await uploadMaterialFile(
                    selectedFile,
                    setUploadPhase,
                    () => {
                        // Cập nhật bảng tiến độ khi có upload mới.
                        setUploadRefreshKey((current) => current + 1);
                    }
                );
            }

            // 3. Xác định API tạo mới hoặc cập nhật.
            // Đặt ngoài if(selectedFile) để hỗ trợ lưu
            // cả khi Admin chỉ sửa thông tin tài liệu.
            const url = isCreating
                ? "/api/admin/materials"
                : `/api/admin/materials/${encodeURIComponent(editing.id)}`;

            // 4. Gửi dữ liệu lên backend.
            const response = await fetch(url, {
                method: isCreating ? "POST" : "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: editing.title.trim(),
                    description: editing.description,
                    collection: editing.collection,
                    level: editing.level,

                    // Khi thay file, đồng bộ loại tài liệu.
                    type: selectedFile
                        ? getMaterialTypeFromFile(selectedFile)
                        : editing.type,

                    language: editing.language,

                    // Verified key khi upload mới;
                    // file cũ nếu không chọn file mới.
                    downloadUrl,

                    status: editing.status,
                    showOnHome: editing.showOnHome,
                }),
            });

            if (!response.ok) {
                throw new Error(await getApiError(response));
            }

            // 5. Làm mới danh sách tài liệu từ MongoDB.
            await loadMaterials();

            //reset form sau khi lưu thành công.
            setUploadPhase(null);

            // 6. Cập nhật bảng tiến độ sau khi attach.
            if (selectedFile) {
                setUploadRefreshKey((current) => current + 1);
            }

            // 7. Reset form sau khi lưu thành công.
            setSelectedFile(null);
            setEditing(null);
            setIsCreating(false);
            resetPage();

        } catch (err) {
            // Nếu upload hoặc attach thất bại:
            // Không đóng modal để Admin xem thông báo lỗi.
            setError(
                err instanceof Error
                    ? err.message
                    : "Không lưu được tài liệu."
            );

        } finally {
            // Luôn mở khóa nút lưu sau khi hoàn tất.
            setSaving(false);
        }
    }

    // =====================================================
    // ĐỔI TRẠNG THÁI XUẤT BẢN / BẢN NHÁP
    // =====================================================

    async function changeStatus(item: Row, next: Status) {
        if (saving) return;

        try {
            setSaving(true);
            setError(null);

            // Chỉ thay đổi trạng thái của tài liệu.
            // Giữ nguyên file hiện tại.
            const response = await fetch(
                `/api/admin/materials/${encodeURIComponent(item.id)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: item.title,
                        description: item.description,
                        collection: item.collection,
                        level: item.level,
                        type: item.type,
                        language: item.language,
                        downloadUrl: item.downloadUrl,
                        status: next,
                        showOnHome: item.showOnHome,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(await getApiError(response));
            }

            // Đồng bộ danh sách sau khi đổi trạng thái.
            await loadMaterials();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không đổi được trạng thái."
            );

        } finally {
            setSaving(false);
        }
    }


    async function deleteMaterial() {
        if (!deleting || saving) return;
        try {
            setSaving(true);
            setError(null);
            const response = await fetch(
                `/api/admin/materials/${encodeURIComponent(deleting.id)}`,
                { method: "DELETE" },
            );
            if (!response.ok) throw new Error(await getApiError(response));
            await loadMaterials();
            setDeleting(null);
            resetPage();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không xóa được tài liệu.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">
                            {isHomeMode ? "Quản lý tài liệu trang chủ" : "Quản lý thư viện tài liệu"}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Quản lý tài liệu tiếng Anh và tiếng Pháp
                        </p>
                    </div>

                </div>

                {error && (
                    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        {error}
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                    {([
                        ["Tổng tài liệu", rows.length],
                        ["Đã xuất bản", rows.filter((item) => item.status === "published").length],
                        ["Bản nháp", rows.filter((item) => item.status === "draft").length],
                    ] as const).map(([label, count]) => (
                        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">{label}</p>
                            <p className="mt-2 text-2xl font-extrabold text-violet-600">{count}</p>
                        </div>
                    ))}
                </div>

                <section className="rounded-2xl  p-4 sm:p-5" aria-label="Bộ lọc tài liệu">


                    <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-2">
                        {/* Tên tài liệu */}
                        <label className="w-60 shrink-0">
                            <span className="mb-1 block text-xs font-semibold text-slate-500">
                                Tên tài liệu
                            </span>

                            <span className="relative block">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    value={search}
                                    onChange={(event) => {
                                        setSearch(event.target.value);
                                        resetPage();
                                    }}
                                    placeholder="Tìm theo tên..."
                                    className={`${selectClass} pl-9`}
                                />
                            </span>
                        </label>

                        {/* Từ ngày */}
                        <label className="w-45 shrink-0">
                            <span className="mb-1 block text-xs font-semibold text-slate-500">
                                Từ ngày
                            </span>

                            <input
                                type="date"
                                value={from}
                                onChange={(event) => {
                                    setFrom(event.target.value);
                                    resetPage();
                                }}
                                className={selectClass}
                            />
                        </label>

                        {/* Đến ngày */}
                        <label className="w-45 shrink-0">
                            <span className="mb-1 block text-xs font-semibold text-slate-500">
                                Đến ngày
                            </span>

                            <input
                                type="date"
                                min={from || undefined}
                                value={to}
                                onChange={(event) => {
                                    setTo(event.target.value);
                                    resetPage();
                                }}
                                className={selectClass}
                            />
                        </label>

                        {/* Lọc theo loại tài liệu
                        <label className="w-40 shrink-0">
                            <span className="mb-1 block text-xs font-semibold text-slate-500">
                                Lọc theo loại tài liệu
                            </span>

                            <select
                                value={typeFilter}
                                onChange={(event) => {
                                    setTypeFilter(
                                        event.target.value as MaterialTypeFilter
                                    );
                                    resetPage();
                                }}
                                className={selectClass}
                            >
                                <option value="all">Tất cả loại tài liệu</option>
                                <option value="pdf">PDF</option>
                                <option value="word">Word</option>
                                <option value="powerpoint">PowerPoint</option>
                            </select>
                        </label> */}

                        {/* Loại tài liệu */}
                        <label className="w-40 shrink-0">
                            <span className="mb-1 block text-xs font-semibold text-slate-500">
                                Loại tài liệu
                            </span>

                            <select
                                value={editing?.type ?? "pdf"} //Không truy cập trực tiếp editing.type khi editing có thể là null.
                                disabled={selectedFile !== null}
                                onChange={(event) => {
                                    setEditing((current) =>
                                        current
                                            ? {
                                                ...current,
                                                type: event.target.value as Row["type"],
                                            }
                                            : null
                                    );
                                }}
                                className={selectClass}
                            >
                                <option value="pdf">PDF</option>
                                <option value="word">Word</option>
                                <option value="powerpoint">PowerPoint</option>
                            </select>
                        </label>

                        {/* Trạng thái */}
                        <label className="w-40 shrink-0">
                            <span className="mb-1 block text-xs font-semibold text-slate-500">
                                Trạng thái
                            </span>

                            <select
                                value={status}
                                onChange={(event) => {
                                    setStatus(event.target.value);
                                    resetPage();
                                }}
                                className={selectClass}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="published">Xuất bản</option>
                                <option value="draft">Bản nháp</option>
                            </select>
                        </label>
                        {/* Nút đặt lại bộ lọc */}
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="
      inline-flex h-11 items-center justify-center gap-2
      rounded-xl border border-slate-200 bg-white px-5 cursor-pointer
      text-sm font-semibold text-slate-600
      shadow-sm transition-all duration-200
      hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700
      focus-visible:outline-none focus-visible:ring-2
      focus-visible:ring-violet-400 focus-visible:ring-offset-2
      active:scale-[0.98]
    "
                        >
                            <RotateCcw size={16} strokeWidth={2} />

                        </button>
                    </div>


                    <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setUploadProgressOpen(true)}
                            aria-haspopup="dialog"
                            aria-expanded={uploadProgressOpen}
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                        >
                            <FileText size={17} />
                            Tiến độ xử lý file
                        </button>

                        {/* Nút thêm tài liệu */}
                        <button
                            type="button"
                            onClick={() => {
                                // Reset file đã chọn trước đó
                                setSelectedFile(null);

                                // Tạo form tài liệu mới
                                setEditing(emptyForm());

                                // Chuyển sang chế độ thêm mới
                                setIsCreating(true);
                            }}
                            className="
      inline-flex h-11 items-center justify-center gap-2
      rounded-xl bg-[#9255FF] px-5
      text-sm font-bold text-white
      shadow-sm shadow-violet-200
      transition-all duration-200
      hover:bg-[#7B42E5] hover:shadow-md
      focus-visible:outline-none focus-visible:ring-2
      focus-visible:ring-violet-400 focus-visible:ring-offset-2
      active:scale-[0.98]
    "
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            <span>Thêm tài liệu</span>
                        </button>

                    </div>

                </section>

                <section className="overflow-hidden -mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Danh sách tài liệu">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                        <h2 className="font-bold">Danh sách tài liệu</h2>
                        <span className="text-sm text-slate-500">{filtered.length} kết quả</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left text-sm">
                            <thead className="bg-violet-50/70 text-xs uppercase tracking-wide text-slate-600">
                                <tr>
                                    {["Tên tài liệu", "Ngày cập nhật", "Loại tài liệu", "Ngôn ngữ", "Trạng thái", "Trang chủ", "Thao tác"].map((label) => (
                                        <th key={label} scope="col" className="px-5 py-4 font-bold">{label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visible.map((item) => {
                                    const Icon = item.type === "powerpoint" ? Presentation : FileText;
                                    return (
                                        <tr
                                            key={item.id}
                                            tabIndex={0}
                                            onClick={() => { setEditing({ ...item }); setIsCreating(false); }}
                                            onKeyDown={(event) => {
                                                if (event.target !== event.currentTarget) return;
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    setEditing({ ...item });
                                                    setIsCreating(false);
                                                }
                                            }}
                                            className="cursor-pointer transition hover:bg-violet-50/60 focus-visible:bg-violet-50 focus-visible:outline-violet-500"
                                            aria-label={`Chỉnh sửa ${item.title}`}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="rounded-xl bg-violet-100 p-2.5 text-violet-600"><Icon size={19} /></span>
                                                    <span className="min-w-0">
                                                        <span className="block max-w-[270px] truncate font-bold">{item.title}</span>
                                                        <span className="block max-w-[270px] truncate text-xs text-slate-500">{item.collection}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                                {new Date(item.updatedAt).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-5 py-4"><span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold">{typeLabels[item.type]}</span></td>
                                            <td className="px-5 py-4">{langLabels[item.language]}</td>
                                            <td className="px-5 py-4">
                                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                                    {statusLabels[item.status]}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-xs font-semibold text-slate-600">{item.showOnHome ? "Có" : "Không"}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">

                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={(event) => {
                                                            event.stopPropagation();

                                                            void changeStatus(
                                                                item,
                                                                item.status === "published" ? "draft" : "published"
                                                            );
                                                        }}
                                                        title={
                                                            item.status === "published"
                                                                ? "Chuyển về nháp"
                                                                : "Xuất bản"
                                                        }
                                                        aria-label={`${item.status === "published"
                                                            ? "Chuyển về nháp"
                                                            : "Xuất bản"
                                                            } ${item.title}`}
                                                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed cursor-pointer ${item.status === "published"
                                                            ? " text-amber-600 "
                                                            : " text-emerald-600 "
                                                            }`}
                                                    >
                                                        {item.status === "published" ? (
                                                            // Đang xuất bản → Nhấn để chuyển về nháp
                                                            <FilePenLine size={16} />
                                                        ) : (
                                                            // Đang là bản nháp → Nhấn để xuất bản
                                                            <Send size={16} />
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={(event) => { event.stopPropagation(); setDeleting(item); }}
                                                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                                        aria-label={`Xóa ${item.title}`}
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {visible.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-14 text-center text-slate-500">
                                            {loading ? "Đang tải tài liệu..." : "Không tìm thấy tài liệu phù hợp."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-slate-100 px-5 pb-5 pt-1">
                        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                </section>
            </div>

            {uploadProgressOpen && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setUploadProgressOpen(false);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="upload-progress-title"
                        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div>
                                <h2 id="upload-progress-title" className="text-xl font-extrabold text-slate-900">
                                    Tiến độ xử lý file
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Theo dõi upload, quét virus và xác minh tài liệu
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setUploadProgressOpen(false)}
                                aria-label="Đóng tiến độ xử lý file"
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 sm:p-5">
                            {uploadPhase && (
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4"
                                >
                                    <p className="text-sm font-semibold text-violet-800">
                                        {{
                                            creating: "Đang tạo phiên upload...",
                                            uploading: "Đang tải file lên R2...",
                                            confirming: "Đang xác nhận file...",
                                            scan_pending: "Đang chờ quét virus...",
                                            scanning: "Đang quét virus bằng ClamAV...",
                                            promotion_pending: "Đang chờ Promotion...",
                                            promoting: "Đang chuyển file sang verified...",
                                            ready: "File đã sẵn sàng.",
                                            infected: "Phát hiện file không an toàn.",
                                            failed: "Xử lý file thất bại.",
                                            expired: "Phiên upload hết hạn.",
                                            cleanup: "File đang được dọn dẹp.",
                                            attached: "File đã được gắn vào tài liệu.",
                                        }[uploadPhase]}
                                    </p>
                                    <p className="mt-1 text-xs text-violet-600">
                                        Vui lòng chờ quá trình kiểm tra hoàn tất.
                                    </p>
                                </div>
                            )}
                            <MaterialUploadProgress refreshKey={uploadRefreshKey} />
                        </div>
                    </div>
                </div>
            )}

            {editing && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !saving) setEditing(null);
                    }}
                >
                    <div role="dialog" aria-modal="true" aria-labelledby="edit-material-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 id="edit-material-title" className="text-xl font-extrabold">
                                {isCreating ? "Thêm tài liệu" : "Chỉnh sửa tài liệu"}
                            </h2>
                            <div className="flex items-center gap-2">
                                {uploadPhase && (
                                    <button
                                        type="button"
                                        onClick={() => setUploadProgressOpen(true)}
                                        aria-haspopup="dialog"
                                        aria-expanded={uploadProgressOpen}
                                        className="rounded-lg px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                                    >
                                        Tiến độ xử lý
                                    </button>
                                )}
                                <button type="button" disabled={saving} onClick={() => setEditing(null)} aria-label="Đóng"><X size={22} /></button>
                            </div>
                        </div>
                        <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="grid gap-4 sm:grid-cols-2">
                            <label className="sm:col-span-2">
                                <span className="mb-1 block text-sm font-semibold">Tên tài liệu *</span>
                                <input required value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className={selectClass} />
                            </label>
                            <label className="sm:col-span-2">
                                <span className="mb-1 block text-sm font-semibold">Mô tả</span>
                                <textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} rows={3} className={selectClass} />
                            </label>

                            <label className="sm:col-span-2">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">
                                    Tải tài liệu lên
                                </span>

                                <input
                                    type="file"
                                    accept=".doc,.docx,.pdf,.ppt,.pptx"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];

                                        if (!file) return;

                                        // Kiểm tra dung lượng tối đa 20MB
                                        if (file.size === 0 || file.size > 20 * 1024 * 1024) {
                                            setSelectedFile(null);
                                            alert("Tệp phải có dung lượng từ 1 byte đến 20 MB.");
                                            event.target.value = "";
                                            return;
                                        }

                                        // Xác định loại tài liệu
                                        const extension = file.name.split(".").pop()?.toLowerCase();

                                        const materialType =
                                            extension === "pdf"
                                                ? "pdf"
                                                : extension === "doc" || extension === "docx"
                                                    ? "word"
                                                    : extension === "ppt" || extension === "pptx"
                                                        ? "powerpoint"
                                                        : null;

                                        if (!materialType) {
                                            alert("Định dạng tệp không được hỗ trợ.");
                                            event.target.value = "";
                                            return;
                                        }

                                        // Lưu file đã chọn để upload khi nhấn nút Lưu
                                        setSelectedFile(file);


                                        // Đồng bộ loại tài liệu
                                        setEditing((current) =>
                                            current ? { ...current, type: materialType } : current
                                        );
                                    }}
                                    className="
      block w-full cursor-pointer rounded-xl
      border border-dashed border-violet-300
      bg-violet-50/50 p-3 text-sm text-slate-600
      file:mr-4 file:rounded-lg file:border-0
      file:bg-violet-100 file:px-4 file:py-2
      file:font-semibold file:text-violet-700
      hover:border-violet-500 hover:bg-violet-50
    "
                                />

                                <p className="mt-2 text-xs text-slate-500">
                                    Hỗ trợ PDF, DOC, DOCX, PPT, PPTX. Tối đa 20MB.
                                </p>
                            </label>

                            <label>
                                <span className="mb-1 block text-sm font-semibold">Ngôn ngữ</span>
                                <select value={editing.language} onChange={(event) => setEditing({ ...editing, language: event.target.value as Row["language"] })} className={selectClass}>
                                    <option value="en">Tiếng Anh</option>
                                    <option value="fr">Tiếng Pháp</option>
                                </select>
                            </label>
                            <label>
                                <span className="mb-1 block text-sm font-semibold">Loại tài liệu</span>
                                <select value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value as Row["type"] })} className={selectClass}>
                                    <option value="pdf">PDF</option>
                                    <option value="word">Word</option>
                                    <option value="powerpoint">PowerPoint</option>
                                </select>
                            </label>
                            <label>
                                <span className="mb-1 block text-sm font-semibold">Trình độ</span>
                                <select value={editing.level} onChange={(event) => setEditing({ ...editing, level: event.target.value as Row["level"] })} className={selectClass}>
                                    {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map((level) => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span className="mb-1 block text-sm font-semibold">Chủ đề</span>
                                <input value={editing.collection} onChange={(event) => setEditing({ ...editing, collection: event.target.value })} className={selectClass} />
                            </label>
                            <label>
                                <span className="mb-1 block text-sm font-semibold">Trạng thái</span>
                                <select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as Status })} className={selectClass}>
                                    <option value="draft">Bản nháp</option>
                                    <option value="published">Xuất bản</option>
                                </select>
                            </label>
                            <label className="flex items-center gap-2 sm:col-span-2">
                                <input type="checkbox" checked={editing.showOnHome} onChange={(event) => setEditing({ ...editing, showOnHome: event.target.checked })} />
                                <span className="text-sm font-semibold">Hiển thị tài liệu trên trang chủ</span>
                            </label>
                            <div className="flex justify-end gap-2 sm:col-span-2">
                                <button type="button" disabled={saving} onClick={() => {
                                    setSelectedFile(null);
                                    setEditing(null);
                                }}
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold">Hủy</button>
                                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#9255FF] px-5 py-2.5 font-bold text-white disabled:opacity-50">
                                    <Save size={16} /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleting && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">
                    <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h2 id="delete-title" className="text-lg font-bold">Xóa tài liệu?</h2>
                        <p className="mt-2 text-sm text-slate-600">Bạn có chắc muốn xóa “{deleting.title}”?</p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" disabled={saving} onClick={() => setDeleting(null)} className="rounded-xl border px-4 py-2">Hủy</button>
                            <button type="button" disabled={saving} onClick={() => void deleteMaterial()} className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white disabled:opacity-50">
                                {saving ? "Đang xóa..." : "Xóa tài liệu"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

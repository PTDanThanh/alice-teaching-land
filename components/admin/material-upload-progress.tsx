
"use client";

import { useEffect, useState } from "react";
import {
    CheckCircle2,
    Circle,
    LoaderCircle,
    AlertCircle,
    FileText,
} from "lucide-react";

type UploadJob = {
    uploadId: string;
    filename: string;
    fileSize: number;
    status: string;
    scanStatus: string;
    promotionStatus: string;
    cleanupStatus: string;
    expired: boolean;
    ready: boolean;
};

type Props = {
    // Tăng giá trị này sau khi tạo phiên upload mới.
    refreshKey?: number;
};

function getProgress(job: UploadJob) {
    if (job.status === "attached") {
        return { step: 4, label: "Đã gắn vào tài liệu", failed: false };
    }

    if (job.cleanupStatus !== "pending") {
        return {
            step: 0,
            label: "Phiên upload đang được dọn dẹp hoặc đã kết thúc",
            failed: true,
        };
    }

    if (job.scanStatus === "infected") {
        return { step: 2, label: "Phát hiện file không an toàn", failed: true };
    }

    if (
        job.scanStatus === "failed" ||
        job.promotionStatus === "failed"
    ) {
        return { step: 2, label: "Xử lý file thất bại", failed: true };
    }

    if (job.ready) {
        return { step: 4, label: "File sẵn sàng sử dụng", failed: false };
    }

    if (job.expired) {
        return { step: 0, label: "Phiên upload đã hết hạn", failed: true };
    }

    if (job.promotionStatus === "promoting") {
        return { step: 3, label: "Đang chuyển sang vùng an toàn", failed: false };
    }

    if (job.scanStatus === "clean") {
        return { step: 3, label: "Đang chờ chuyển file", failed: false };
    }

    if (job.scanStatus === "scanning") {
        return { step: 2, label: "Đang quét virus", failed: false };
    }

    if (job.status === "confirmed") {
        return { step: 2, label: "Đang chờ quét virus", failed: false };
    }

    return { step: 1, label: "Đang chờ xác nhận upload", failed: false };
}

const steps = [
    "Tạo phiên upload",
    "Kiểm tra bảo mật",
    "Chuyển sang verified",
    "Sẵn sàng sử dụng",
];

export default function MaterialUploadProgress({
    refreshKey = 0,
}: Props) {
    const [jobs, setJobs] = useState<UploadJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        // Đọc trạng thái thực tế từ MongoDB thông qua API.
        async function refresh() {
            try {
                const response = await fetch(
                    "/api/admin/materials/upload/jobs",
                    { cache: "no-store" }
                );

                if (!response.ok) {
                    throw new Error("Không thể cập nhật tiến độ xử lý file.");
                }

                const result = await response.json();

                if (!Array.isArray(result.data?.jobs)) {
                    throw new Error("Dữ liệu tiến độ không hợp lệ.");
                }

                if (active) {
                    setJobs(result.data.jobs);
                    setError(null);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error ? err.message : "Có lỗi xảy ra."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void refresh();

        // Cập nhật định kỳ. Không tự thay đổi trạng thái giả.
        const interval = setInterval(() => {
            if (document.visibilityState === "visible") {
                void refresh();
            }
        }, 3000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [refreshKey]);

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {error && (
                <p role="alert" className="mb-3 text-sm text-rose-600">
                    {error}
                </p>
            )}

            {loading && jobs.length === 0 && (
                <p className="text-sm text-slate-500">Đang tải tiến độ...</p>
            )}

            {!loading && jobs.length === 0 && (
                <p className="text-sm text-slate-500">
                    Chưa có phiên upload nào.
                </p>
            )}

            <div className="space-y-4">
                {jobs.map((job) => {
                    const progress = getProgress(job);

                    return (
                        <div
                            key={job.uploadId}
                            className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <FileText size={20} className="shrink-0 text-violet-600" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">
                                            {job.filename}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {(job.fileSize / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>

                                <span
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${progress.failed
                                            ? "bg-rose-100 text-rose-700"
                                            : progress.step === 4
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-violet-100 text-violet-700"
                                        }`}
                                >
                                    {progress.label}
                                </span>
                            </div>

                            {/* Thanh tiến độ theo các bước xử lý thực tế */}
                            <div className="mt-4 grid grid-cols-4 gap-1.5">
                                {steps.map((step, index) => (
                                    <div
                                        key={step}
                                        title={step}
                                        className={`h-2 rounded-full ${index < progress.step
                                                ? progress.failed
                                                    ? "bg-rose-400"
                                                    : "bg-violet-500"
                                                : "bg-slate-200"
                                            }`}
                                    />
                                ))}
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {steps.map((step, index) => {
                                    const complete = index < progress.step;
                                    const current =
                                        !progress.failed && index === progress.step;

                                    return (
                                        <div key={step} className="flex items-center gap-2">
                                            {complete ? (
                                                <CheckCircle2
                                                    size={15}
                                                    className="text-emerald-600"
                                                />
                                            ) : current ? (
                                                <LoaderCircle
                                                    size={15}
                                                    className="animate-spin text-violet-600"
                                                />
                                            ) : progress.failed &&
                                                index === progress.step ? (
                                                <AlertCircle
                                                    size={15}
                                                    className="text-rose-600"
                                                />
                                            ) : (
                                                <Circle size={15} className="text-slate-300" />
                                            )}

                                            <span className="text-xs text-slate-600">
                                                {step}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

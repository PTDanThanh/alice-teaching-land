
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className = "",
}: PaginationProps) {
    // Không hiển thị khi chỉ có một trang
    if (totalPages < 1) return null;

    // Chỉ hiển thị tối đa 5 số trang, có dấu ... khi cần
    const getVisiblePages = (): (number | string)[] => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages = new Set([
            1,
            totalPages,
            currentPage - 1,
            currentPage,
            currentPage + 1,
        ]);

        const visible = [...pages]
            .filter((page) => page >= 1 && page <= totalPages)
            .sort((a, b) => a - b);

        const result: (number | string)[] = [];

        visible.forEach((page, index) => {
            if (index > 0) {
                const gap = page - visible[index - 1];

                if (gap === 2) {
                    result.push(page - 1);
                } else if (gap > 2) {
                    result.push("...");
                }
            }

            result.push(page);
        });

        return result;
    };

    return (
        <nav
            aria-label="Phân trang"
            className={`flex w-full shrink-0 flex-wrap items-center justify-center gap-2 ${className}`}
        >
            {/* Nút trang trước */}
            <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Trang trước"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Danh sách số trang */}
            {getVisiblePages().map((page, index) =>
                typeof page === "number" ? (
                    <button
                        key={page}
                        type="button"
                        onClick={() => onPageChange(page)}
                        aria-label={`Trang ${page}`}
                        aria-current={currentPage === page ? "page" : undefined}
                        className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${currentPage === page
                            ? "bg-[#9255FF] text-white shadow-md shadow-violet-200"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-600"
                            }`}
                    >
                        {page}
                    </button>
                ) : (
                    <span
                        key={`ellipsis-${index}`}
                        className="flex h-10 w-8 items-center justify-center text-slate-400"
                        aria-hidden="true"
                    >
                        ...
                    </span>
                ),
            )}

            {/* Nút trang sau */}
            <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Trang sau"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ChevronRight className="h-5 w-5" />
            </button>
        </nav>
    );
}

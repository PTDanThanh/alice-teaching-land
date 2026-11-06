
"use client";

import { useEffect, useRef, useState } from "react";

import "./docx-preview.css";

interface DocxPreviewProps {
    materialId: string;
}

export default function DocxPreview({
    materialId,
}: DocxPreviewProps) {
    // Vùng chứa các trang Word
    const containerRef = useRef<HTMLDivElement>(null);

    // Vùng chứa CSS do docx-preview tạo ra
    const styleRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadPreview() {
            setLoading(true);
            setError("");

            // Xóa nội dung cũ khi chuyển tài liệu
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }

            if (styleRef.current) {
                styleRef.current.innerHTML = "";
            }

            try {
                // 1. Lấy file DOCX gốc từ API
                const response = await fetch(
                    `/api/materials/${encodeURIComponent(materialId)}/docx`,
                    {
                        signal: controller.signal,
                        cache: "no-store",
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Không thể tải DOCX (${response.status})`
                    );
                }

                // 2. Đọc dữ liệu nhị phân của file Word
                const buffer = await response.arrayBuffer();

                if (controller.signal.aborted) return;

                // 3. Tải thư viện ở client để tránh lỗi SSR
                const { renderAsync } = await import("docx-preview");

                if (
                    controller.signal.aborted ||
                    !containerRef.current ||
                    !styleRef.current
                ) {
                    return;
                }

                // 4. Render tài liệu DOCX
                await renderAsync(
                    buffer,
                    containerRef.current,
                    styleRef.current,
                    {
                        // Giữ ngắt trang
                        breakPages: true,

                        // Hiển thị header và footer
                        renderHeaders: true,
                        renderFooters: true,

                        // Hiển thị ghi chú cuối trang
                        renderFootnotes: true,
                        renderEndnotes: true,

                        // Sử dụng các kiểu định dạng trong DOCX
                        useBase64URL: true,

                        // Hiển thị các trang Word
                        className: "docx",
                    }
                );

                if (controller.signal.aborted) return;
            } catch (err) {
                if (!controller.signal.aborted) {
                    console.error("[DOCX Preview]", err);
                    setError("Không thể xem trước tài liệu DOCX.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadPreview();

        return () => {
            controller.abort();
        };
    }, [materialId]);

    return (
        <div className="docx-preview-wrapper">
            {/* CSS được sinh từ file DOCX */}
            <div ref={styleRef} />

            {/* Thông báo tải */}
            {loading && (
                <div className="p-8 text-center text-slate-500">
                    Đang tải và xử lý tài liệu Word...
                </div>
            )}

            {/* Thông báo lỗi */}
            {error && (
                <div className="p-8 text-center text-red-500">
                    {error}
                </div>
            )}

            {/* Vùng hiển thị các trang DOCX */}
            <div
                ref={containerRef}
                className={
                    loading || error
                        ? "hidden"
                        : "docx-preview-container"
                }
            />
        </div>
    );
}

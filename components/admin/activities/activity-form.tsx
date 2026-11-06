"use client";

import type { ActivityPostInput } from "@/lib/activities/types";
import ActivityEditor from "./activity-editor";
import { useState, type ChangeEvent } from "react";

export type ActivityRow = ActivityPostInput & { _id: string; updatedAt: string; createdAt?: string };
export const emptyActivity: ActivityPostInput = {
  title: "", slug: "", excerpt: "", category: "learning", image: null,
  content: [], contentHtml: "", status: "draft", featured: false, sortOrder: 0,
};
export function slugify(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
}
type Props = { value: ActivityPostInput; onChange: (next: ActivityPostInput) => void; idPrefix: string };
const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

// Bài cũ vẫn lưu content dạng heading/text; dựng HTML để có thể sửa bằng Tiptap.
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function initialHtml(value: ActivityPostInput) {
  if (value.contentHtml) return value.contentHtml;
  return value.content.map((block) => `${block.heading ? `<h2>${escapeHtml(block.heading)}</h2>` : ""}<p>${escapeHtml(block.text).replace(/\n/g, "<br>")}</p>`).join("");
}

export default function ActivityForm({ value, onChange, idPrefix }: Props) {
  const update = <K extends keyof ActivityPostInput>(key: K, val: ActivityPostInput[K]) => onChange({ ...value, [key]: val });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Ảnh không được vượt quá 5 MB.");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    setImageError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/admin/activities/upload-image",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Không thể upload ảnh.",
        );
      }

      // Lưu URL ảnh vào dữ liệu bài viết
      update("image", result.data.url);
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Upload ảnh thất bại.",
      );
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
    <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">Nội dung bài viết</h2>
      <label
        className="block text-sm font-medium text-slate-700"
        htmlFor={`${idPrefix}-title`}
      >
        Tên bài viết

        <input
          id={`${idPrefix}-title`}
          className={inputClass}
          value={value.title}
          maxLength={200}
          onChange={(e) => {
            const title = e.target.value;

            onChange({
              ...value,
              title,
              // Tự động tạo slug khi nhập tiêu đề
              slug: slugify(title),
            });
          }}
          required
        />
      </label>
      <label
        className="block text-sm font-medium text-slate-700"
        htmlFor={`${idPrefix}-slug`}
      >
        Đường dẫn (slug)

        <input
          id={`${idPrefix}-slug`}
          className={`${inputClass} bg-slate-50 text-slate-500`}
          value={value.slug}
          placeholder="Tự động tạo từ tên bài viết"
          readOnly
        />

        <span className="mt-1 block text-xs text-slate-500">
          Đường dẫn được tự động tạo từ tên bài viết.
        </span>
      </label>
      <label className="block text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-category`}>Chủ đề
        <select id={`${idPrefix}-category`} className={inputClass} value={value.category} onChange={(e) => update("category", e.target.value as ActivityPostInput["category"])}><option value="learning">Góc học tập</option><option value="sharing">Chia sẻ</option></select>
      </label>
      <label className="block text-sm font-medium text-slate-700" htmlFor={`${idPrefix}-excerpt`}>Mô tả ngắn
        <textarea id={`${idPrefix}-excerpt`} className={inputClass} rows={3} maxLength={600} value={value.excerpt} onChange={(e) => update("excerpt", e.target.value)} />
      </label>
      <div className="space-y-2"><h3 className="text-sm font-semibold text-slate-700">Trình soạn thảo nội dung</h3>
        <ActivityEditor value={initialHtml(value)} onChange={(html) => update("contentHtml", html)} />
        <p className="text-xs text-slate-500">Có thể chèn tiêu đề, định dạng, bảng, liên kết, ảnh và chỉnh sửa mã HTML.</p>
      </div>
    </section>

    <aside className="space-y-5 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">Ảnh và tùy chọn</h2>

      {/* Chọn ảnh bìa từ máy tính */}
      <div className="space-y-2">
        <label
          htmlFor={`${idPrefix}-image`}
          className="block text-sm font-medium text-slate-700"
        >
          Ảnh bìa bài viết
        </label>

        <input
          id={`${idPrefix}-image`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploadingImage}
          onChange={handleImageUpload}
          className="block w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:font-semibold file:text-violet-700 hover:file:bg-violet-200"
        />

        <p className="text-xs text-slate-500">
          Hỗ trợ JPG, PNG, WebP (tối đa 5 MB)
        </p>

        {uploadingImage && (
          <p role="status" className="text-sm text-violet-600">
            Đang tải ảnh lên...
          </p>
        )}

        {imageError && (
          <p role="alert" className="text-sm text-red-600">
            {imageError}
          </p>
        )}
      </div>

      {/* Khung xem trước ảnh */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">
          Xem trước ảnh bìa
        </p>

        <div className="relative flex aspect-[2/1] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
          {value.image ? (
            <img
              src={value.image}
              alt="Xem trước ảnh bìa bài viết"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-center text-sm text-slate-400">
              <p>Chưa có ảnh bìa</p>
              <p className="mt-1 text-xs">
                Chọn ảnh để hiển thị tại đây
              </p>
            </div>
          )}
        </div>

        {value.image && (
          <>
            <p className="break-all text-xs text-slate-500">
              {value.image}
            </p>

            <button
              type="button"
              disabled={uploadingImage}
              onClick={() => update("image", null)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Xóa ảnh bìa
            </button>
          </>
        )}
      </div>

      {/* Các tùy chọn bài viết giữ nguyên */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.featured}
          onChange={(e) => update("featured", e.target.checked)}
        />
        Bài viết nổi bật
      </label>

      <label
        className="block text-sm font-medium text-slate-700"
        htmlFor={`${idPrefix}-order`}
      >
        Thứ tự hiển thị

        <input
          id={`${idPrefix}-order`}
          type="number"
          min={0}
          step={1}
          className={inputClass}
          value={value.sortOrder}
          onChange={(e) => update("sortOrder", Number(e.target.value))}
        />
      </label>

      <label
        className="block text-sm font-medium text-slate-700"
        htmlFor={`${idPrefix}-status`}
      >
        Trạng thái

        <select
          id={`${idPrefix}-status`}
          className={inputClass}
          value={value.status}
          onChange={(e) =>
            update(
              "status",
              e.target.value as ActivityPostInput["status"],
            )
          }
        >
          <option value="draft">Bản nháp</option>
          <option value="published">Đã xuất bản</option>
        </select>
      </label>
    </aside>
  </div>;
}

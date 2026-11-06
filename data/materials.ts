export type MaterialLanguage = "en" | "fr";
export type MaterialFormat = "word" | "pdf" | "powerpoint";
export type MaterialLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type MaterialTypeFilter = MaterialFormat | "all";
export type MaterialStatus = "published" | "draft";
export interface Material {
  id: string;
  title: string;
  description: string;
  language: MaterialLanguage;
  type: MaterialFormat;
  level: MaterialLevel;
  collection: string;
  updatedAt: string;
  downloadUrl: string | null;
  status: MaterialStatus;
  showOnHome: boolean;
  // PDF Preview được chuyển đổi từ PowerPoint
  previewKey?: string | null;
}
export const materials: Material[] = []; // Không dùng làm nguồn dữ liệu nữa; dữ liệu thật lấy qua API.
export const materialLanguages = [{ id: "en", label: "Tiếng Anh", flag: "🇬🇧" }, { id: "fr", label: "Tiếng Pháp", flag: "🇫🇷" }] as const;
export const materialLevels: MaterialLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const materialFormats = {
  word: { label: "Word", iconClass: "bg-blue-50 text-blue-600", badgeClass: "bg-blue-100 text-blue-700" },
  pdf: { label: "PDF", iconClass: "bg-red-50 text-red-500", badgeClass: "bg-red-100 text-red-600" },
  powerpoint: { label: "PowerPoint", iconClass: "bg-orange-50 text-orange-600", badgeClass: "bg-orange-100 text-orange-700" },
} satisfies Record<MaterialFormat, { label: string; iconClass: string; badgeClass: string }>;
export const materialTypeFilters: { id: MaterialTypeFilter; label: string }[] = [
  { id: "all", label: "Tất cả" }, { id: "word", label: "Word" },
  { id: "pdf", label: "PDF" }, { id: "powerpoint", label: "PowerPoint" },
];
export const materialStatuses = [
  { id: "all", label: "Tất cả trạng thái" },
  { id: "published", label: "Xuất bản" },
  { id: "draft", label: "Bản nháp" },
] as const;
// Chỉ dùng được với mảng dữ liệu đã fetch, không tra cứu DB.
export function getMaterialById(id: string) { return materials.find(m => m.id === id); }
export function formatMaterialDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}
export function normalizeMaterialText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

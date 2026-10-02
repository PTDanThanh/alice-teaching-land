export type MaterialLanguage = "en" | "fr";
export type MaterialFormat = "word" | "pdf" | "powerpoint";
export type MaterialLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type MaterialTypeFilter = MaterialFormat | "all";

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
}

export const materialLanguages = [
  { id: "en", label: "Tiếng Anh", flag: "🇬🇧" },
  { id: "fr", label: "Tiếng Pháp", flag: "🇫🇷" },
] as const;

export const materialLevels: MaterialLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
];

export const materialFormats = {
  word: {
    label: "Word",
    iconClass: "bg-blue-50 text-blue-600",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  pdf: {
    label: "PDF",
    iconClass: "bg-red-50 text-red-500",
    badgeClass: "bg-red-100 text-red-600",
  },
  powerpoint: {
    label: "PowerPoint",
    iconClass: "bg-orange-50 text-orange-600",
    badgeClass: "bg-orange-100 text-orange-700",
  },
} satisfies Record<
  MaterialFormat,
  {
    label: string;
    iconClass: string;
    badgeClass: string;
  }
>;

export const materialTypeFilters: {
  id: MaterialTypeFilter;
  label: string;
}[] = [
  { id: "all", label: "Tất cả" },
  { id: "word", label: "Word" },
  { id: "pdf", label: "PDF" },
  { id: "powerpoint", label: "PowerPoint" },
];

// Dữ liệu demo. Chỉ điền downloadUrl khi đã có file thật.
export const materials: Material[] = [
  {
    id: "en-grammar-1",
    title: "Bộ đề ôn tập ngữ pháp tiếng Anh",
    description:
      "Tổng hợp bài tập ngữ pháp trọng tâm kèm đáp án, phù hợp cho người học trình độ B1.",
    language: "en",
    type: "word",
    level: "B1",
    collection: "Top Notch 1",
    updatedAt: "2026-09-23",
    downloadUrl: null,
  },
  {
    id: "en-grammar-2",
    title: "Bài tập ngữ pháp và cấu trúc câu",
    description:
      "Luyện tập các cấu trúc câu thường dùng và củng cố kiến thức qua bài tập theo chủ đề.",
    language: "en",
    type: "word",
    level: "B2",
    collection: "Top Notch 2",
    updatedAt: "2026-09-23",
    downloadUrl: null,
  },
  {
    id: "en-vocabulary",
    title: "Tài liệu từ vựng tiếng Anh nâng cao",
    description:
      "Ôn tập từ vựng theo tình huống và thực hành cách sử dụng từ trong ngữ cảnh.",
    language: "en",
    type: "pdf",
    level: "B2",
    collection: "Summit 1",
    updatedAt: "2026-09-23",
    downloadUrl: null,
  },
  {
    id: "en-review",
    title: "Bộ đề luyện tập tiếng Anh tổng hợp",
    description:
      "Hệ thống bài tập hỗ trợ ôn tập ngữ pháp, từ vựng và kỹ năng đọc hiểu.",
    language: "en",
    type: "pdf",
    level: "B1",
    collection: "Top Notch 2",
    updatedAt: "2026-09-23",
    downloadUrl: null,
  },
  {
    id: "en-slides-1",
    title: "Bài giảng giao tiếp tiếng Anh",
    description:
      "Các mẫu hội thoại gần gũi cùng hoạt động thực hành dành cho người học tiếng Anh.",
    language: "en",
    type: "powerpoint",
    level: "A2",
    collection: "Top Notch 1",
    updatedAt: "2026-09-23",
    downloadUrl: null,
  },
  {
    id: "en-slides-2",
    title: "Bài giảng từ vựng theo chủ đề",
    description:
      "Học từ vựng qua hình ảnh, ví dụ và những tình huống sử dụng hằng ngày.",
    language: "en",
    type: "powerpoint",
    level: "A1",
    collection: "Top Notch 1",
    updatedAt: "2026-09-23",
    downloadUrl: null,
  },
  {
    id: "fr-grammar",
    title: "Bài tập ngữ pháp tiếng Pháp cơ bản",
    description:
      "Làm quen với các cấu trúc cơ bản và luyện tập chia động từ theo từng bài học.",
    language: "fr",
    type: "word",
    level: "A1",
    collection: "Tiếng Pháp A1",
    updatedAt: "2026-09-23",
    downloadUrl: null,
  },
  {
    id: "fr-vocabulary",
    title: "Từ vựng tiếng Pháp trong cuộc sống",
    description:
      "Tổng hợp từ vựng và mẫu câu giao tiếp theo các chủ đề quen thuộc.",
    language: "fr",
    type: "pdf",
    level: "A2",
    collection: "Tiếng Pháp A2",
    updatedAt: "2026-09-23",
    downloadUrl: null,
  },
  {
    id: "fr-slides",
    title: "Bài giảng phát âm tiếng Pháp",
    description:
      "Khám phá các âm cơ bản và luyện phát âm qua ví dụ dễ tiếp cận.",
    language: "fr",
    type: "powerpoint",
    level: "A1",
    collection: "Phát âm cơ bản",
    updatedAt: "2026-09-23",
    downloadUrl: null,
  },
];

export function getMaterialById(id: string) {
  return materials.find((material) => material.id === id);
}

export function formatMaterialDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
  }).format(new Date(value));
}

export function normalizeMaterialText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
import { validateQuizletUrl } from "@/lib/quizlet-url";
export const MODE_KEYS = ["flashcards", "learn", "test", "match", "spell"] as const;
export type ModeKey = typeof MODE_KEYS[number];
export type FlashcardPayload = {
 slug: string; title: string; description: string; language: "en" | "fr"; level: string;
 quizletUrl: string; status: "draft" | "published"; sortOrder: number;
 modes: Record<ModeKey, { enabled: boolean; embedUrl: string }>;
};
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
// Chỉ nhận URL HTTPS Quizlet, tuyệt đối không lưu/render HTML iframe tùy ý.
export function parseFlashcardPayload(raw: unknown): FlashcardPayload {
 if (!isRecord(raw)) throw new Error("Dữ liệu không hợp lệ");
 const slug = String(raw.slug ?? "").trim();
 const title = String(raw.title ?? "").trim();
 const description = String(raw.description ?? "").trim();
 const level = String(raw.level ?? "A1").trim();
 const language = raw.language;
 const status = raw.status;
 const sortOrder = Number(raw.sortOrder ?? 0);
 const quizletUrl = validateQuizletUrl(String(raw.quizletUrl ?? ""));
 if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) throw new Error("Slug chỉ gồm chữ thường, số và dấu gạch nối");
 if (!title || title.length > 180 || description.length > 2000 || level.length > 30) throw new Error("Tên, mô tả hoặc trình độ không hợp lệ");
 if (language !== "en" && language !== "fr") throw new Error("Ngôn ngữ không hợp lệ");
 if (status !== "draft" && status !== "published") throw new Error("Trạng thái không hợp lệ");
 if (!Number.isSafeInteger(sortOrder) || Math.abs(sortOrder) > 100000) throw new Error("Thứ tự không hợp lệ");
 if (!quizletUrl) throw new Error("URL Quizlet không hợp lệ");
 if (!isRecord(raw.modes)) throw new Error("Thiếu cấu hình chế độ học");
 const modes = {} as FlashcardPayload["modes"];
 for (const key of MODE_KEYS) {
   const entry = raw.modes[key];
   if (!isRecord(entry)) throw new Error(`Thiếu chế độ ${key}`);
   const enabled = entry.enabled === true;
   const rawUrl = String(entry.embedUrl ?? "").trim();
   const embedUrl = rawUrl ? validateQuizletUrl(rawUrl, true) : "";
   if (rawUrl && !embedUrl) throw new Error(`URL nhúng ${key} không hợp lệ`);
   if (enabled && !embedUrl) throw new Error(`Chế độ ${key} chưa có URL nhúng`);
   modes[key] = { enabled, embedUrl: embedUrl || "" };
 }
 if (!modes.flashcards.enabled) throw new Error("Flashcards phải được bật");
 return { slug, title, description, language, level, quizletUrl, status, sortOrder, modes };
}

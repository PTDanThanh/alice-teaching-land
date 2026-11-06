
// lib/quizlet-url.ts

// Các chế độ nhúng Quizlet mà hệ thống quản lý.
export type QuizletEmbedMode =
  | "flashcards"
  | "learn"
  | "test"
  | "match"
  | "spell";

// Chỉ khai báo và export hàm này MỘT LẦN.
export function validateQuizletUrl(
  value: string,
  requireEmbed = false,
  expectedMode?: QuizletEmbedMode,
): string | null {
  try {
    const url = new URL(value.trim());

    // Chỉ cho phép HTTPS và domain Quizlet.
    if (
      url.protocol !== "https:" ||
      url.hostname !== "quizlet.com" ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    // Nếu là URL nhúng thì phải kết thúc bằng /embed.
    if (
      requireEmbed &&
      !url.pathname.replace(/\/$/, "").endsWith("/embed")
    ) {
      return null;
    }

    // Kiểm tra chế độ học nếu được truyền vào.
    // Chỉ áp dụng khi URL theo đúng cấu trúc này.
    if (expectedMode) {
      const parts = url.pathname.split("/").filter(Boolean);

      if (
        parts.length !== 3 ||
        !/^\d+$/.test(parts[0]) ||
        parts[1] !== expectedMode ||
        parts[2] !== "embed"
      ) {
        return null;
      }
    }

    return url.href;
  } catch {
    return null;
  }
}

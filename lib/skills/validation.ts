import {
  extractYouTubeVideoId,
  parseTimestampedTranscript,
} from "./dictation";
import type { ListeningLessonInput } from "./types";

type ValidationResult =
  | { ok: true; data: ListeningLessonInput }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseListeningLessonPayload(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, error: "Dữ liệu bài luyện nghe không hợp lệ." };
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const language = input.language;
  const youtubeUrl =
    typeof input.youtubeUrl === "string" ? input.youtubeUrl.trim() : "";
  const transcript =
    typeof input.transcript === "string" ? input.transcript.trim() : "";
  const status = input.status ?? "draft";

  if (!title || title.length > 160) {
    return { ok: false, error: "Tên bài phải có từ 1 đến 160 ký tự." };
  }
  if (language !== "en" && language !== "fr") {
    return { ok: false, error: "Ngôn ngữ bài luyện không hợp lệ." };
  }
  if (youtubeUrl.length > 2048) {
    return { ok: false, error: "Link YouTube quá dài." };
  }

  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    return {
      ok: false,
      error: "Link YouTube không hợp lệ. Hãy dùng link watch, youtu.be hoặc shorts.",
    };
  }
  if (!transcript || transcript.length > 200_000) {
    return { ok: false, error: "Transcript phải có nội dung và tối đa 200.000 ký tự." };
  }
  if (status !== "draft" && status !== "published") {
    return { ok: false, error: "Trạng thái bài luyện không hợp lệ." };
  }

  const parsed = parseTimestampedTranscript(transcript);
  if (parsed.errors.length || !parsed.segments.length) {
    return {
      ok: false,
      error: parsed.errors.join(" ") || "Cần ít nhất một câu có timestamp hợp lệ.",
    };
  }

  return {
    ok: true,
    data: {
      title,
      language,
      youtubeUrl,
      videoId,
      transcript,
      segments: parsed.segments,
      status,
    },
  };
}

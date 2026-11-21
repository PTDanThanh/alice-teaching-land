import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const MAX_DURATION_SECONDS = 12 * 60;
const MAX_SOURCE_BYTES = 80 * 1024 * 1024;
const MAX_TRANSCRIPTION_MS = 260 * 1000;
const MAX_STDOUT_BYTES = 2_000_000;

export class TranscriptionError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function normalizeYouTubeUrl(raw: string): string {
  if (typeof raw !== "string" || raw.length > 500) throw new TranscriptionError("URL không hợp lệ.");
  let url: URL;
  try { url = new URL(raw); } catch { throw new TranscriptionError("URL YouTube không hợp lệ."); }
  if (url.protocol !== "https:") throw new TranscriptionError("Chỉ chấp nhận HTTPS.");
  const host = url.hostname.toLowerCase();
  if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
    throw new TranscriptionError("Chỉ hỗ trợ URL YouTube chính thức.");
  }
  if (url.username || url.password || (url.port && url.port !== "443")) {
    throw new TranscriptionError("URL YouTube không hợp lệ.");
  }
  let id = "";
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
  else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] ?? "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new TranscriptionError("Không tìm thấy YouTube video ID hợp lệ.");
  return `https://www.youtube.com/watch?v=${id}`;
}

async function run(
  binary: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  deadline: number,
): Promise<string> {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) {
    throw new TranscriptionError(
      "Đã hết thời gian xử lý transcript. Hãy thử video ngắn hơn.",
      504,
    );
  }

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, LC_ALL: "C" },
    });
    let out = "";
    let err = "";
    let settled = false;
    let outputLimitExceeded = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(out);
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1500).unref();
      finish(new TranscriptionError("Quá thời gian xử lý video. Hãy thử video ngắn hơn.", 504));
    }, Math.min(timeoutMs, remainingMs));
    child.stdout.on("data", (chunk: Buffer) => {
      if (Buffer.byteLength(out) + chunk.length > MAX_STDOUT_BYTES) {
        outputLimitExceeded = true;
        child.kill("SIGTERM");
        return;
      }
      out += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => { err = (err + chunk.toString()).slice(-5000); });
    child.once("error", (error: NodeJS.ErrnoException) => {
      const tool = path.basename(binary);

      console.error("[transcription] Không khởi chạy được công cụ", {
        tool,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
      });

      finish(
        new TranscriptionError(
          `Không chạy được ${tool}. Kiểm tra cấu hình công cụ trên server.`,
          503,
        ),
      );
    });
    child.once("close", (code) => {
      if (settled) return;
      if (outputLimitExceeded) {
        finish(new TranscriptionError("Đầu ra công cụ vượt quá giới hạn cho phép.", 502));
        return;
      }
      if (code !== 0) finish(new TranscriptionError(`Xử lý thất bại ở bước ${path.basename(binary)}. Kiểm tra quyền truy cập video và công cụ đã cài.`, 422));
      else finish();
    });
  });
}

function srtTime(raw: string): string {
  const match = raw.match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) throw new TranscriptionError("Whisper trả về timestamp không hợp lệ.", 502);
  const totalMinutes = Number(match[1]) * 60 + Number(match[2]);
  return `${String(totalMinutes).padStart(2, "0")}:${match[3]}.${match[4]}`;
}

export function convertSrtToDictation(srt: string): string {
  const results: string[] = [];
  for (const block of srt.replace(/\r/g, "").trim().split(/\n\s*\n/)) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const markerIndex = lines.findIndex((line) => line.includes(" --> "));
    if (markerIndex === -1) continue;
    const times = lines[markerIndex].split(/\s+-->\s+/);
    if (times.length !== 2) continue;
    const text = lines.slice(markerIndex + 1).join(" ").replace(/\s+/g, " ").replace(/\|/g, " ").trim();
    if (!text) continue;
    results.push(`${srtTime(times[0])} --> ${srtTime(times[1].split(" ")[0])} | ${text}`);
  }
  if (!results.length) throw new TranscriptionError("Không phát hiện lời nói. Hãy thử video có âm thanh rõ hơn.", 422);
  return results.join("\n");
}

export async function transcribeYouTube(videoUrl: string, language: "en" | "fr"): Promise<string> {
  const deadline = Date.now() + MAX_TRANSCRIPTION_MS;
  const url = normalizeYouTubeUrl(videoUrl);
  if (process.env.ENABLE_YOUTUBE_TRANSCRIPTION !== "true") {
    throw new TranscriptionError("Chức năng tải YouTube chưa được bật trên server.", 503);
  }
  const model = process.env.WHISPER_MODEL_PATH;
  if (!model || !path.isAbsolute(model)) throw new TranscriptionError("Chưa cấu hình WHISPER_MODEL_PATH.", 503);
  const ytDlp = process.env.YT_DLP_PATH || "yt-dlp";
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  const whisper = process.env.WHISPER_CLI_PATH || "whisper-cli";
  try {
    if (!(await stat(model)).isFile()) {
      throw new TranscriptionError("WHISPER_MODEL_PATH phải trỏ tới file model.", 503);
    }
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    throw new TranscriptionError("Không đọc được file model Whisper đã cấu hình.", 503);
  }

  const dir = await mkdtemp(path.join(tmpdir(), "alice-dictation-"));
  try {
    const metadataText = await run(ytDlp, ["--ignore-config", "--no-playlist", "--ies", "youtube", "--skip-download", "--dump-single-json", url], dir, 30_000, deadline);
    let metadata: { duration?: number; is_live?: boolean; live_status?: string };
    try { metadata = JSON.parse(metadataText); } catch { throw new TranscriptionError("Không đọc được thông tin video.", 422); }
    if (!Number.isFinite(metadata.duration) || !metadata.duration || metadata.duration > MAX_DURATION_SECONDS || metadata.duration < 1) {
      throw new TranscriptionError("Chỉ hỗ trợ video dài tối đa 12 phút, có thời lượng xác định.");
    }
    if (metadata.is_live || metadata.live_status === "is_live") throw new TranscriptionError("Không hỗ trợ livestream.");
    await run(ytDlp, [
      "--ignore-config", "--no-playlist", "--ies", "youtube", "--no-progress",
      "--max-filesize", "80M", "-f", "bestaudio/best",
      "-o", path.join(dir, "source.%(ext)s"), url,
    ], dir, 120_000, deadline);
    const files = await readdir(dir);
    const source = files.find((f) => /^source\.[a-zA-Z0-9]+$/.test(f));
    if (!source) throw new TranscriptionError("Không tìm thấy audio đã tải.", 422);
    if ((await stat(path.join(dir, source))).size > MAX_SOURCE_BYTES) throw new TranscriptionError("Audio vượt quá 80MB.");
    const wav = path.join(dir, "input.wav");
    await run(ffmpeg, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", path.join(dir, source), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav], dir, 90_000, deadline);
    // whisper-cli creates <output-base>.srt when -osrt is set.
    const outBase = path.join(dir, "transcript");
    await run(whisper, ["-m", model, "-f", wav, "-l", language, "-osrt", "-of", outBase], dir, 180_000, deadline);
    const srt = await readFile(`${outBase}.srt`, "utf8");
    return convertSrtToDictation(srt);
  } finally {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch (error) {
      console.error("[transcription] Failed to remove temporary files", error);
      throw new TranscriptionError(
        "Không thể dọn tệp tạm sau khi xử lý transcript.",
        500,
      );
    }
  }
}

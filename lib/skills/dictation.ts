export type DictationSegment = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

export type WordResult = {
  kind: "correct" | "substitution" | "missing" | "extra";
  expected?: string;
  actual?: string;
};

export function extractYouTubeVideoId(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (/^\/(shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split("/")[2] ?? null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function parseTime(value: string): number | null {
  const chunks = value.trim().split(":").map(Number);
  if (chunks.length < 2 || chunks.length > 3 || chunks.some(v => !Number.isFinite(v) || v < 0)) return null;
  const [hours, minutes, seconds] = chunks.length === 3 ? chunks : [0, ...chunks];
  if (minutes >= 60 || seconds >= 60) return null;
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

/** Một dòng: 00:00.000 --> 00:03.200 | Hello everyone. */
export function parseTimestampedTranscript(input: string): { segments: DictationSegment[]; errors: string[] } {
  const segments: DictationSegment[] = [];
  const errors: string[] = [];
  input.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const match = line.match(/^\s*([0-9:.]+)\s*-->\s*([0-9:.]+)\s*\|\s*(.+?)\s*$/);
    if (!match) { errors.push(`Dòng ${index + 1}: định dạng không hợp lệ.`); return; }
    const startMs = parseTime(match[1]);
    const endMs = parseTime(match[2]);
    if (startMs === null || endMs === null || endMs <= startMs) {
      errors.push(`Dòng ${index + 1}: mốc thời gian không hợp lệ.`); return;
    }
    if (segments.length && startMs < segments[segments.length - 1].endMs) {
      errors.push(`Dòng ${index + 1}: thời gian trùng hoặc không theo thứ tự.`); return;
    }
    segments.push({ id: `line-${index + 1}`, startMs, endMs, text: match[3].trim() });
  });
  return { segments, errors };
}

const tokenize = (text: string) => text.normalize("NFC").trim().split(/\s+/u).filter(Boolean);
const normalize = (word: string) => word.toLocaleLowerCase().normalize("NFC").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/** Căn chỉnh ở cấp độ từ để phân biệt từ đúng, thiếu, thừa và thay thế. */
export function gradeDictation(expectedText: string, actualText: string) {
  const expected = tokenize(expectedText);
  const actual = tokenize(actualText);
  const n = expected.length;
  const m = actual.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = normalize(expected[i - 1]) === normalize(actual[j - 1]) ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  let i = n, j = m;
  const reversed: WordResult[] = [];
  while (i > 0 || j > 0) {
    if (i && j) {
      const same = normalize(expected[i - 1]) === normalize(actual[j - 1]);
      if (dp[i][j] === dp[i - 1][j - 1] + (same ? 0 : 1)) {
        reversed.push({ kind: same ? "correct" : "substitution", expected: expected[i - 1], actual: actual[j - 1] });
        i--; j--; continue;
      }
    }
    if (i && dp[i][j] === dp[i - 1][j] + 1) {
      reversed.push({ kind: "missing", expected: expected[i - 1] }); i--; continue;
    }
    reversed.push({ kind: "extra", actual: actual[j - 1] }); j--;
  }
  const words = reversed.reverse();
  const correctWords = words.filter(w => w.kind === "correct").length;
  return { words, correctWords, totalWords: n, percent: n ? Math.round((correctWords / n) * 100) : 100 };
}

export function formatMs(ms: number): string {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
}

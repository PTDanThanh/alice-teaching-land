"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, Headphones, Pause, Play, RotateCcw, Video } from "lucide-react";
import { formatMs, gradeDictation, type DictationSegment, type WordResult } from "@/lib/skills/dictation";
import ListeningLessonCatalog, { type PublishedListeningLesson } from "./listening-lesson-catalog";

type YTPlayer = {
  destroy(): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
};
type YTApi = {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    width: string;
    height: string;
    playerVars: Record<string, string | number>;
    events: { onReady: () => void; onError: (event: { data: number }) => void };
  }) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;
function ensureYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        youtubeApiPromise = null;
        reject(new Error("Không thể tải YouTube IFrame API."));
      };
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

function YouTubeSentencePlayer({
  videoId,
  segment,
  autoPause,
  onMessage,
}: {
  videoId: string;
  segment: DictationSegment | null;
  autoPause: boolean;
  onMessage: (text: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const segmentRef = useRef(segment);
  const autoPauseRef = useRef(autoPause);
  const pausedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    segmentRef.current = segment;
    pausedRef.current = false;
  }, [segment]);
  useEffect(() => { autoPauseRef.current = autoPause; }, [autoPause]);

  useEffect(() => {
    let disposed = false;
    const target = mountRef.current;
    if (!target) return;
    // The iframe is recreated only when the video changes, not per sentence.
    const child = document.createElement("div");
    target.replaceChildren(child);
    void ensureYouTubeApi().then(() => {
      if (disposed || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(child, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, controls: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => { if (!disposed) setReady(true); },
          onError: (event) => { if (!disposed) onMessage(`Không thể phát video (YouTube error ${event.data}).`); },
        },
      });
    }).catch((error: unknown) => {
      if (!disposed) onMessage(error instanceof Error ? error.message : "Không tải được YouTube Player.");
    });
    return () => {
      disposed = true;
      try { playerRef.current?.destroy(); } catch { /* Player may be uninitialized. */ }
      playerRef.current = null;
      target.replaceChildren();
    };
  }, [videoId, onMessage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      const active = segmentRef.current;
      if (!player || !active || !autoPauseRef.current || pausedRef.current) return;
      try {
        if (player.getPlayerState() === 1 && player.getCurrentTime() * 1000 >= active.endMs - 90) {
          player.pauseVideo();
          pausedRef.current = true;
        }
      } catch { /* Player state may be changing. */ }
    }, 120);
    return () => window.clearInterval(timer);
  }, []);

  const replay = () => {
    const active = segmentRef.current;
    if (!ready || !active) return;
    pausedRef.current = false;
    playerRef.current?.seekTo(active.startMs / 1000, true);
    playerRef.current?.playVideo();
  };

  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-inner">
        <div ref={mountRef} className="h-full w-full" aria-label="YouTube video player" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={replay} disabled={!ready || !segment} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-40">
          <Play className="h-4 w-4" aria-hidden="true" /> Nghe câu này
        </button>
        <button type="button" onClick={() => playerRef.current?.pauseVideo()} disabled={!ready} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">
          <Pause className="h-4 w-4" aria-hidden="true" /> Tạm dừng
        </button>
        {segment && <span className="ml-auto text-xs font-medium text-slate-500">{formatMs(segment.startMs)} – {formatMs(segment.endMs)}</span>}
      </div>
    </div>
  );
}

function WordFeedback({ words }: { words: WordResult[] }) {
  return (
    <div className="flex flex-wrap gap-2 leading-7">
      {words.map((word, index) => {
        const style = {
          correct: "border-emerald-200 bg-emerald-50 text-emerald-800",
          substitution: "border-rose-200 bg-rose-50 text-rose-800",
          missing: "border-amber-200 bg-amber-50 text-amber-900",
          extra: "border-sky-200 bg-sky-50 text-sky-800",
        }[word.kind];
        const label = {
          correct: word.expected,
          substitution: `${word.actual} → ${word.expected}`,
          missing: ` ${word.expected}`,
          extra: ` ${word.actual}`,
        }[word.kind];
        return <span key={`${word.kind}-${index}`} className={`rounded-lg border px-2 py-1 text-sm ${style}`}>{label}</span>;
      })}
    </div>
  );
}

export default function ListeningDictation() {
  const [lessons, setLessons] = useState<PublishedListeningLesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [lessonLoadError, setLessonLoadError] = useState("");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [autoPause, setAutoPause] = useState(true);
  const [results, setResults] = useState<Record<string, number>>({});

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const segments = selectedLesson?.segments ?? [];
  const active = segments[index] ?? null;
  const grade = submitted && active ? gradeDictation(active.text, answer) : null;
  const completed = segments.filter((segment) => results[segment.id] !== undefined).length;
  const handlePlayerMessage = useCallback((text: string) => setMessage(text), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/skills/listening", { cache: "no-store" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok) {
          const errorMessage = typeof data === "object" && data !== null && "error" in data
            ? String(data.error)
            : "Không tải được bài luyện nghe.";
          throw new Error(errorMessage);
        }
        if (!Array.isArray(data)) throw new Error("Dữ liệu bài luyện nghe không hợp lệ.");
        if (!cancelled) setLessons(data as PublishedListeningLesson[]);
        // Important: do NOT auto-select the first lesson. The catalog is the landing view.
      })
      .catch((error: unknown) => {
        if (!cancelled) setLessonLoadError(error instanceof Error ? error.message : "Không tải được dữ liệu.");
      })
      .finally(() => { if (!cancelled) setLoadingLessons(false); });
    return () => { cancelled = true; };
  }, []);

  const selectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setIndex(0);
    setAnswer("");
    setSubmitted(false);
    setResults({});
    setMessage("");
  };
  const returnToCatalog = () => {
    setSelectedLessonId("");
    setIndex(0);
    setAnswer("");
    setSubmitted(false);
    setMessage("");
  };
  const submit = () => {
    if (!active || !answer.trim()) return;
    const result = gradeDictation(active.text, answer);
    setResults((previous) => ({ ...previous, [active.id]: result.percent }));
    setSubmitted(true);
  };
  const moveTo = (next: number) => {
    setIndex(next);
    setAnswer("");
    setSubmitted(false);
  };

  if (loadingLessons) {
    return <div role="status" className="rounded-3xl p-10 text-center text-sm text-slate-600">Đang tải danh sách bài chép chính tả...</div>;
  }
  if (lessonLoadError) {
    return <div role="alert" className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">{lessonLoadError}</div>;
  }
  if (!selectedLesson) {
    return <ListeningLessonCatalog lessons={lessons} onSelect={selectLesson} />;
  }

  return (
    <div className="relative space-y-7">
      <aside className="flex h-120 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm min-[1800px]:absolute min-[1800px]:right-full min-[1800px]:top-0 min-[1800px]:mr-5 min-[1800px]:w-72">
        <nav aria-label="Danh sách bài học" className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <h2 className="text-[16px] font-bold text-slate-900">
              Danh sách bài học
            </h2>
            <span className="shrink-0 text-[12px] text-slate-500">
              {lessons.length} bài
            </span>
          </div>

          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {lessons.map((lesson) => {
              const isCurrent = lesson.id === selectedLesson.id;

              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={() => {
                      if (!isCurrent) selectLesson(lesson.id);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-violet-500 ${isCurrent
                      ? "border-violet-200 bg-violet-50 text-violet-900"
                      : "border-transparent text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <span className="block break-words text-sm font-semibold">
                      {lesson.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Ngôn ngữ: {lesson.language === "fr" ? "Français" : "English"}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Tổng câu: {lesson.segments.length} câu
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <header className="space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>

            <h2 className="text-[16px] font-bold tracking-tight text-slate-900 sm:text-3xl">{selectedLesson.title}</h2>
            <p className="mt-2 text[14px] text-slate-600">Nghe từng câu, chép lại và kiểm tra chính tả.</p>
          </div>
          <span className="rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">{selectedLesson.language === "fr" ? "Français" : "English"}</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-6">

          <section aria-label="Video bài luyện nghe" className="">
            <YouTubeSentencePlayer videoId={selectedLesson.videoId} segment={active} autoPause={autoPause} onMessage={handlePlayerMessage} />
            {message && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm sm:p-4">
            <h3 className="text-lg font-bold text-slate-900">Các câu trong bài</h3>
            <p className="mt-2 text-sm text-slate-500">Đã chấm: {completed}/{segments.length}</p>
            <div className="mt-2 max-h-50 space-y-2 overflow-y-auto">
              {segments.map((item, i) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => moveTo(i)}
                  aria-current={i === index ? "step" : undefined}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm ${i === index ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-100 text-slate-700 hover:bg-slate-50"}`}
                >
                  <span>Câu {i + 1} · {formatMs(item.startMs)}–{formatMs(item.endMs)}</span>
                  {results[item.id] !== undefined && <span className="font-bold">{results[item.id]}%</span>}
                </button>
              ))}
            </div>
          </section>

        </div>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">Chép chính tả</h3>
              {active && <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">Câu {index + 1}/{segments.length}</span>}
            </div>
            {active ? (
              <>
                <textarea
                  id="dictation-answer"
                  rows={5}
                  lang={selectedLesson.language}
                  value={answer}
                  onChange={(event) => { setAnswer(event.target.value); if (submitted) setSubmitted(false); }}
                  placeholder={selectedLesson.language === "fr" ? "Écrivez ce que vous entendez..." : "Type what you hear..."}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-4 text-base leading-7 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={submit} disabled={!answer.trim()} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-40">Submit</button>
                  <button type="button" onClick={() => { setAnswer(""); setSubmitted(false); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Nhập lại</button>
                </div>
                {grade && (
                  <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/50 p-5" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 font-bold text-slate-900"><CheckCircle2 className="h-5 w-5 text-violet-700" aria-hidden="true" /> Kết quả của bạn</h4><strong className="text-xl text-violet-700">{grade.percent}%</strong></div>
                    <p className="mt-2 text-sm text-slate-600">{grade.correctWords}/{grade.totalWords} từ đúng</p>
                    <div className="mt-4"><WordFeedback words={grade.words} /></div>
                    <div className="mt-4 rounded-xl bg-white p-3 text-sm leading-7 text-slate-800"><strong>Đáp án:</strong> {active.text}</div>

                  </div>
                )}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <button type="button" disabled={index === 0} onClick={() => moveTo(index - 1)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-30">Câu trước</button>
                  <button type="button" disabled={index === segments.length - 1} onClick={() => moveTo(index + 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-30">Câu tiếp <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              </>
            ) : <p className="mt-5 text-sm text-slate-500">Bài học chưa có câu luyện tập.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}


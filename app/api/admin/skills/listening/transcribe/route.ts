import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { TranscriptionError, transcribeYouTube } from "@/lib/skills/transcription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// In-memory semaphore is only for one persistent Node.js process.
// Deploy this endpoint on a single trusted self-hosted instance, not serverless.
let busy = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Không có quyền." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (busy) {
      return NextResponse.json(
        { error: "Máy chủ đang xử lý video khác. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": "60",
          },
        }
      );
    }
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
      return NextResponse.json(
        { error: "Yêu cầu phải là application/json." },
        { status: 415, headers: { "Cache-Control": "no-store" } }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: "JSON không hợp lệ." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
      throw error;
    }
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (body.acknowledgedRights !== true) {
      return NextResponse.json(
        { error: "Cần xác nhận quyền tải và xử lý video." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (
      typeof body.youtubeUrl !== "string" ||
      (body.language !== "en" && body.language !== "fr")
    ) {
      return NextResponse.json(
        { error: "URL hoặc ngôn ngữ không hợp lệ." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    busy = true;
    try {
      const transcript = await transcribeYouTube(
        body.youtubeUrl,
        body.language
      );
      return NextResponse.json({ transcript }, { headers: { "Cache-Control": "no-store" } });
    } finally { busy = false; }
  } catch (error) {
    if (error instanceof TranscriptionError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }
    console.error("[transcribe] request failed", error);
    return NextResponse.json(
      { error: "Không thể tạo transcript. Kiểm tra cấu hình máy chủ." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

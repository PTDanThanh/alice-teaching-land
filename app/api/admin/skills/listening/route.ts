import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/session";
import connectToDatabase from "@/lib/mongodb";
import ListeningLesson from "@/src/models/ListeningLesson";
import { parseListeningLessonPayload } from "@/lib/skills/validation";

export const runtime = "nodejs";

async function denyNonAdmin() {
  const user = await getCurrentSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    const denied = await denyNonAdmin();
    if (denied) return denied;

    await connectToDatabase();
    const lessons = await ListeningLesson.find()
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json(lessons);
  } catch (error) {
    console.error("[Listening lessons admin GET]", error);
    return NextResponse.json(
      { error: "Không tải được danh sách bài luyện nghe" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const denied = await denyNonAdmin();
    if (denied) return denied;

    const parsed = parseListeningLessonPayload(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await connectToDatabase();
    const lesson = await ListeningLesson.create({
      ...parsed.data,
      publishedAt:
        parsed.data.status === "published" ? new Date() : null,
    });
    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
    }
    console.error("[Listening lessons admin POST]", error);
    return NextResponse.json(
      { error: "Không tạo được bài luyện nghe" },
      { status: 500 },
    );
  }
}

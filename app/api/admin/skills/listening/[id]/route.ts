import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/session";
import connectToDatabase from "@/lib/mongodb";
import ListeningLesson from "@/src/models/ListeningLesson";
import { parseListeningLessonPayload } from "@/lib/skills/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

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

export async function PUT(request: Request, { params }: Context) {
  try {
    const denied = await denyNonAdmin();
    if (denied) return denied;

    const { id } = await params;
    if (!mongoose.isObjectIdOrHexString(id)) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    const parsed = parseListeningLessonPayload(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await connectToDatabase();
    const existing = await ListeningLesson.findById(id)
      .select("status publishedAt")
      .lean();
    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy bài luyện nghe" },
        { status: 404 },
      );
    }

    const publishedAt =
      parsed.data.status === "published"
        ? existing.status === "published" && existing.publishedAt
          ? existing.publishedAt
          : new Date()
        : null;
    const lesson = await ListeningLesson.findByIdAndUpdate(
      id,
      { $set: { ...parsed.data, publishedAt } },
      { new: true, runValidators: true },
    );
    return lesson
      ? NextResponse.json(lesson)
      : NextResponse.json(
          { error: "Không tìm thấy bài luyện nghe" },
          { status: 404 },
        );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
    }
    console.error("[Listening lessons admin PUT]", error);
    return NextResponse.json(
      { error: "Không cập nhật được bài luyện nghe" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const denied = await denyNonAdmin();
    if (denied) return denied;

    const { id } = await params;
    if (!mongoose.isObjectIdOrHexString(id)) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await ListeningLesson.findByIdAndDelete(id);
    return deleted
      ? NextResponse.json({ ok: true })
      : NextResponse.json(
          { error: "Không tìm thấy bài luyện nghe" },
          { status: 404 },
        );
  } catch (error) {
    console.error("[Listening lessons admin DELETE]", error);
    return NextResponse.json(
      { error: "Không xóa được bài luyện nghe" },
      { status: 500 },
    );
  }
}

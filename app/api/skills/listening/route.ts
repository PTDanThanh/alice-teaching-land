import { NextResponse } from "next/server";

import connectToDatabase from "@/lib/mongodb";
import ListeningLesson from "@/src/models/ListeningLesson";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectToDatabase();
    const lessons = await ListeningLesson.find({ status: "published" })
      .select("title language videoId segments publishedAt")
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();
    return NextResponse.json(
      lessons.map((lesson) => ({
        id: lesson._id.toString(),
        title: lesson.title,
        language: lesson.language,
        videoId: lesson.videoId,
        segments: lesson.segments,
        publishedAt: lesson.publishedAt,
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Listening lessons public GET]", error);
    return NextResponse.json(
      { error: "Không tải được bài luyện nghe" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

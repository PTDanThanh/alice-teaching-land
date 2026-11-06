import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FlashcardSet from "@/src/models/FlashcardSet";

// API chạy trên Node.js để sử dụng Mongoose.
export const runtime = "nodejs";

// GET /api/flashcards
// Trả về danh sách bộ thẻ đã xuất bản.
export async function GET() {
  try {
    await connectToDatabase();

    const sets = await FlashcardSet.find({
      status: "published",
    })
      .sort({
        sortOrder: 1,
        createdAt: -1,
      })
      .select(
        "slug title description language level quizletUrl modes",
      )
      .lean();

    return NextResponse.json(sets);
  } catch (error) {
    console.error("[Public flashcards]", error);

    return NextResponse.json(
      { error: "Không tải được bộ thẻ" },
      { status: 500 },
    );
  }
}
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FlashcardSet from "@/src/models/FlashcardSet";

export const runtime = "nodejs";

// GET /api/flashcards/[id]
// [id] ở đây thực chất là slug của bộ thẻ.
export async function GET(
    _req: Request,
    {
        params,
    }: {
        params: Promise<{ id: string }>;
    },
) {
    const { id } = await params;

    try {
        await connectToDatabase();

        // Chỉ trả về bộ thẻ đã xuất bản.
        const set = await FlashcardSet.findOne({
            slug: id,
            status: "published",
        })
            .select(
                "slug title description language level quizletUrl modes",
            )
            .lean();

        if (!set) {
            return NextResponse.json(
                { error: "Không tìm thấy bộ thẻ" },
                { status: 404 },
            );
        }

        return NextResponse.json(set);
    } catch (error) {
        console.error("[Public flashcard detail]", error);

        return NextResponse.json(
            { error: "Không tải được bộ thẻ" },
            { status: 500 },
        );
    }
}
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { getCurrentSessionUser } from "@/lib/auth/session";
import FlashcardSet from "@/src/models/FlashcardSet";
import { parseFlashcardPayload } from "@/lib/flashcards/validation";
export const runtime = "nodejs";
async function adminResponse() { const user = await getCurrentSessionUser(); return !user ? NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) : user.role !== "admin" ? NextResponse.json({ error: "Không có quyền" }, { status: 403 }) : null; }
export async function GET() {
 const denied = await adminResponse(); if (denied) return denied;
 try { await connectToDatabase(); const sets = await FlashcardSet.find().sort({ sortOrder: 1, createdAt: -1 }).lean(); return NextResponse.json(sets); }
 catch (e) { console.error("[Flashcards admin GET]",e); return NextResponse.json({ error: "Không tải được dữ liệu" }, { status: 500 }); }
}
export async function POST(request: Request) {
 const denied = await adminResponse(); if (denied) return denied;
 try { const data = parseFlashcardPayload(await request.json()); await connectToDatabase(); const created = await FlashcardSet.create(data); return NextResponse.json(created, { status: 201 }); }
 catch (e) { if (e && typeof e === "object" && "code" in e && e.code === 11000) return NextResponse.json({ error: "Slug đã tồn tại" }, { status: 409 });
 if (e instanceof SyntaxError) return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
 if (e instanceof Error && !e.message.startsWith("FlashcardSet validation")) return NextResponse.json({ error: e.message }, { status: 400 });
 console.error("[Flashcards admin POST]",e); return NextResponse.json({ error: "Không thể tạo bộ thẻ" }, { status: 500 }); }
}

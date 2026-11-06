import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { getCurrentSessionUser } from "@/lib/auth/session";
import ActivityPost from "@/src/models/ActivityPost";
import { parseActivityPayload } from "@/lib/activities/validation";

export const runtime = "nodejs";

// Tái sử dụng xác thực Admin hiện có, không phụ thuộc Flashcards.
async function denyNonAdmin() {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  return null;
}

// GET /api/admin/activities: lấy tất cả bài viết, kể cả bản nháp.
export async function GET() {
  try {
    const denied = await denyNonAdmin();
    if (denied) return denied;
    await connectToDatabase();
    const posts = await ActivityPost.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    return NextResponse.json(posts);
  } catch (error) {
    console.error("[Activities admin GET]", error);
    return NextResponse.json({ error: "Không tải được bài viết" }, { status: 500 });
  }
}

// POST /api/admin/activities: tạo bài viết mới.
export async function POST(request: Request) {
  try {
    const denied = await denyNonAdmin();
    if (denied) return denied;
    const payload: unknown = await request.json();
    const parsed = parseActivityPayload(payload);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    await connectToDatabase();
    const created = await ActivityPost.create({
      ...parsed.data,
      // Không nhận publishedAt từ client; server quyết định thời điểm đăng.
      publishedAt: parsed.data.status === "published" ? new Date() : null,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
    if (isDuplicateKey(error))
      return NextResponse.json({ error: "Slug đã tồn tại" }, { status: 409 });
    console.error("[Activities admin POST]", error);
    return NextResponse.json({ error: "Không tạo được bài viết" }, { status: 500 });
  }
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import { getCurrentSessionUser } from "@/lib/auth/session";
import ActivityPost from "@/src/models/ActivityPost";
import { parseActivityPayload } from "@/lib/activities/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

async function denyNonAdmin() {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  return null;
}

function validId(id: string) {
  return mongoose.isObjectIdOrHexString(id);
}
function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

// GET /api/admin/activities/:id: chi tiết để điền vào form chỉnh sửa.
export async function GET(_request: Request, { params }: Context) {
  try {
    const denied = await denyNonAdmin();
    if (denied) return denied;
    const { id } = await params;
    if (!validId(id)) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    await connectToDatabase();
    const post = await ActivityPost.findById(id).lean();
    return post
      ? NextResponse.json(post)
      : NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });
  } catch (error) {
    console.error("[Activities admin GET by ID]", error);
    return NextResponse.json({ error: "Không tải được bài viết" }, { status: 500 });
  }
}

// PUT: cập nhật toàn bộ dữ liệu form; validation giống POST.
export async function PUT(request: Request, { params }: Context) {
  try {
    const denied = await denyNonAdmin();
    if (denied) return denied;
    const { id } = await params;
    if (!validId(id)) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    const payload: unknown = await request.json();
    const parsed = parseActivityPayload(payload);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    await connectToDatabase();
    // Giữ ngày đăng lần đầu khi chỉnh sửa; gỡ bài sẽ đặt lại null.
    const existing = await ActivityPost.findById(id).select("status publishedAt").lean();
    if (!existing) return NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });
    const publishedAt = parsed.data.status === "published"
      ? (existing.status === "published" && existing.publishedAt ? existing.publishedAt : new Date())
      : null;
    const updated = await ActivityPost.findByIdAndUpdate(
      id,
      { $set: { ...parsed.data, publishedAt } },
      { new: true, runValidators: true },
    );
    return updated
      ? NextResponse.json(updated)
      : NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
    if (isDuplicateKey(error))
      return NextResponse.json({ error: "Slug đã tồn tại" }, { status: 409 });
    console.error("[Activities admin PUT]", error);
    return NextResponse.json({ error: "Không cập nhật được bài viết" }, { status: 500 });
  }
}

// DELETE: xóa vĩnh viễn. Gỡ bài khỏi trang công khai thì dùng PUT status=draft.
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const denied = await denyNonAdmin();
    if (denied) return denied;
    const { id } = await params;
    if (!validId(id)) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    await connectToDatabase();
    const deleted = await ActivityPost.findByIdAndDelete(id);
    return deleted
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Không tìm thấy bài viết" }, { status: 404 });
  } catch (error) {
    console.error("[Activities admin DELETE]", error);
    return NextResponse.json({ error: "Không xóa được bài viết" }, { status: 500 });
  }
}

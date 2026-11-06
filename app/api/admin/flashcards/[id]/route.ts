import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import { getCurrentSessionUser } from "@/lib/auth/session";
import FlashcardSet from "@/src/models/FlashcardSet";
import { parseFlashcardPayload } from "@/lib/flashcards/validation";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
async function deny() { const u = await getCurrentSessionUser(); return !u ? NextResponse.json({error:"Chưa đăng nhập"},{status:401}) : u.role !== "admin" ? NextResponse.json({error:"Không có quyền"},{status:403}) : null; }
export async function PUT(req: Request, {params}:Context) {
 const d=await deny();if(d)return d;const {id}=await params;if(!mongoose.isValidObjectId(id))return NextResponse.json({error:"ID không hợp lệ"},{status:400});
 try {const data=parseFlashcardPayload(await req.json());await connectToDatabase();const updated=await FlashcardSet.findByIdAndUpdate(id,{$set:data},{new:true,runValidators:true});return updated?NextResponse.json(updated):NextResponse.json({error:"Không tìm thấy"},{status:404});}
 catch(e){if(e && typeof e==="object" && "code" in e && e.code===11000)return NextResponse.json({error:"Slug đã tồn tại"},{status:409});if(e instanceof Error)return NextResponse.json({error:e.message},{status:400});return NextResponse.json({error:"Không cập nhật được"},{status:500});}
}
export async function DELETE(_req:Request,{params}:Context){const d=await deny();if(d)return d;const {id}=await params;if(!mongoose.isValidObjectId(id))return NextResponse.json({error:"ID không hợp lệ"},{status:400});await connectToDatabase();const deleted=await FlashcardSet.findByIdAndDelete(id);return deleted?NextResponse.json({ok:true}):NextResponse.json({error:"Không tìm thấy"},{status:404});}

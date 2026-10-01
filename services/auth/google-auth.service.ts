// File này chỉ chạy ở server. Không nhận role hay thông tin user từ frontend; 
// thông tin tài khoản được lấy từ token Google đã xác minh.
// Nếu email đã có tài khoản chưa liên kết Google, API yêu cầu dùng phương thức đăng nhập cũ.
import "server-only";

import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";

import connectToDatabase from "@/lib/mongodb";
import { AuthError } from "@/lib/auth/http";
import User from "@/src/models/auth/user.model";
import { limit, newSession } from "@/services/auth/auth.service";

const googleClient = new OAuth2Client();

export async function authenticateWithGoogle(
  body: Record<string, unknown>,
) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing GOOGLE_CLIENT_ID");
  }

  const credential = body.credential;

  if (
    typeof credential !== "string" ||
    !credential ||
    credential.length > 8192
  ) {
    throw new AuthError("Token Google không hợp lệ.", 400);
  }

  await connectToDatabase();
  await limit("google-auth:global", 60);

  const payload = await (async () => {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      return ticket.getPayload();
    } catch {
      throw new AuthError(
        "Không thể xác minh Google. Vui lòng đăng nhập lại.",
        401,
      );
    }
  })();

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new AuthError("Tài khoản Google chưa xác minh email.", 401);
  }

  const email = payload.email.trim().toLowerCase();

  if (!email || email.length > 254) {
    throw new AuthError("Email không hợp lệ.", 400);
  }

  // Bảo đảm unique indexes đã được tạo.
  await User.init();

  let user = await User.findOne({ googleId: payload.sub });

  if (!user) {
    if (await User.exists({ email })) {
      throw new AuthError(
        "Email này đã có tài khoản. Hãy đăng nhập bằng phương thức đã đăng ký.",
        409,
      );
    }

    try {
      user = await User.create({
        fullName:
          payload.name?.trim().slice(0, 100) ||
          email.split("@")[0].slice(0, 100),
        email,
        googleId: payload.sub,
        avatar: payload.picture ?? "",
        role: "client",
        isActive: true,
      });
    } catch (error) {
      if (
        error instanceof mongoose.mongo.MongoServerError &&
        error.code === 11000
      ) {
        // Xử lý trường hợp hai request tạo cùng tài khoản đồng thời.
        user = await User.findOne({ googleId: payload.sub });

        if (!user) {
          throw new AuthError(
            "Email này đã có tài khoản. Hãy dùng phương thức đăng nhập cũ.",
            409,
          );
        }
      } else {
        throw error;
      }
    }
  }

  if (!user || !user.isActive) {
    throw new AuthError("Tài khoản không khả dụng.", 403);
  }

  // Dùng lại access token + refresh token của website.
  return newSession(user, false);
}
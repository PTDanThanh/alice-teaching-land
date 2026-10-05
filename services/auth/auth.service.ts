import "server-only";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import connectToDatabase from "@/lib/mongodb";
import { AuthError } from "@/lib/auth/http";
import {
  createRefreshToken,
  getRefreshSessionId,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/auth/tokens";
import User, { type UserDocument as UserRecord } from "@/src/models/auth/user.model";
import Session from "@/src/models/auth/session.model";

export function publicUser(
  user: Pick<UserRecord, "_id" | "fullName" | "email" | "role">,
) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

// Rate limiter MongoDB để dùng chung giữa các server.
const rateLimitSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthRateLimit =
  mongoose.models.AuthRateLimit ??
  mongoose.model("AuthRateLimit", rateLimitSchema);

export async function limit(key: string, maximum: number) {
  const windowMs = 15 * 60 * 1000;
  const windowId = Math.floor(Date.now() / windowMs);

  const bucket = await AuthRateLimit.findOneAndUpdate(
    { _id: hashToken(`${key}:${windowId}`) },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        expiresAt: new Date((windowId + 2) * windowMs),
      },
    },
    { upsert: true, new: true },
  );

  if (!bucket || bucket.count > maximum) {
    throw new AuthError(
      "Thao tác quá nhiều lần. Vui lòng thử lại sau.",
      429,
    );
  }
}

export async function newSession(
  user: UserRecord,
  rememberMe: boolean,
) {
  const sessionId = new mongoose.Types.ObjectId();
  const refreshToken = createRefreshToken(String(sessionId));

  const expiresAt = new Date(
    Date.now() + (rememberMe ? 7 : 1) * 24 * 60 * 60 * 1000,
  );

  const accessToken = await signAccessToken(
    String(user._id),
    String(sessionId),
  );

  await Session.create({
    _id: sessionId,
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return {
    user: publicUser(user),
    accessToken,
    refreshToken,
    expiresAt,
  };
}

export async function register(body: Record<string, unknown>) {
  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!fullName || fullName.length > 100) {
    throw new AuthError("Họ và tên không hợp lệ.", 400);
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new AuthError("Email không hợp lệ.", 400);
  }

  if (
    !password ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new AuthError("Mật khẩu phải có ít nhất 8 ký tự.", 400);
  }

  if (
    body.rememberMe !== undefined &&
    typeof body.rememberMe !== "boolean"
  ) {
    throw new AuthError("Dữ liệu đăng ký không hợp lệ.", 400);
  }

  await connectToDatabase();
  await limit(`register:${email}`, 10);

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AuthError("Email này đã được sử dụng.", 409);
  }

  const user = await User.create({
    fullName,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "client",
    isActive: true,
  });

  return newSession(user, body.rememberMe === true);
}

export async function login(body: Record<string, unknown>) {
  if (
    typeof body.email !== "string" ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    typeof body.password !== "string" ||
    !body.password ||
    Buffer.byteLength(body.password, "utf8") > 72 ||
    (body.rememberMe !== undefined &&
      typeof body.rememberMe !== "boolean")
  ) {
    throw new AuthError("Dữ liệu đăng nhập không hợp lệ.", 400);
  }

  const email = body.email.trim().toLowerCase();

  await connectToDatabase();
  await limit(`login:${email}`, 10);

  const user = await User.findOne({ email }).select("+passwordHash");

  // Hash dự phòng giúp giảm khác biệt thời gian khi tài khoản không tồn tại.
  const fallbackHash =
    "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

  const matches = await bcrypt.compare(
    body.password,
    user?.passwordHash || fallbackHash,
  );

  if (!user || !user.passwordHash || !matches || !user.isActive) {
    throw new AuthError("Email hoặc mật khẩu không chính xác.");
  }

  return newSession(user, body.rememberMe === true);
}

export async function refresh(refreshToken: string | undefined) {
  const sessionId = getRefreshSessionId(refreshToken);

  if (!sessionId || !refreshToken) {
    throw new AuthError("Phiên đăng nhập không hợp lệ.");
  }

  await connectToDatabase();

  const tokenHash = hashToken(refreshToken);
  const nextToken = createRefreshToken(sessionId);

  // Chỉ một request có thể dùng refresh token hiện tại thành công.
  const session = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: { tokenHash: hashToken(nextToken) },
      $push: { usedTokenHashes: tokenHash },
    },
    { new: true },
  );

  if (!session) {
    // Thu hồi phiên nếu token đã dùng bị gửi lại.
    await Session.updateOne(
      {
        _id: sessionId,
        usedTokenHashes: tokenHash,
        revokedAt: null,
      },
      { $set: { revokedAt: new Date() } },
    );

    throw new AuthError("Phiên đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const user = await User.findOne({
    _id: session.userId,
    isActive: true,
  });

  if (!user) {
    await Session.updateOne(
      { _id: sessionId },
      { $set: { revokedAt: new Date() } },
    );

    throw new AuthError("Tài khoản không khả dụng.");
  }

  return {
    user: publicUser(user),
    accessToken: await signAccessToken(String(user._id), sessionId),
    refreshToken: nextToken,
    expiresAt: session.expiresAt,
  };
}

export async function currentUser(accessToken: string | undefined) {
  if (!accessToken) {
    throw new AuthError("Bạn chưa đăng nhập.");
  }

  const payload = await verifyAccessToken(accessToken);

  if (!payload) {
    throw new AuthError("Access token đã hết hạn hoặc không hợp lệ.");
  }

  await connectToDatabase();

  const session = await Session.exists({
    _id: payload.sessionId,
    userId: payload.userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new AuthError("Phiên đăng nhập đã bị thu hồi.");
  }

  const user = await User.findOne({
    _id: payload.userId,
    isActive: true,
  });

  if (!user) {
    throw new AuthError("Tài khoản không khả dụng.");
  }

  return publicUser(user);
}

export async function logout(
  refreshToken: string | undefined,
  accessToken: string | undefined,
) {
  await connectToDatabase();

  const sessionId = getRefreshSessionId(refreshToken);

  if (sessionId && refreshToken) {
    await Session.updateOne(
      { _id: sessionId, tokenHash: hashToken(refreshToken) },
      { $set: { revokedAt: new Date() } },
    );
  }

  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);

    if (payload) {
      await Session.updateOne(
        { _id: payload.sessionId, userId: payload.userId },
        { $set: { revokedAt: new Date() } },
      );
    }
  }
}
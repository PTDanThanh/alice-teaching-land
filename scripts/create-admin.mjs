import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

if (!MONGODB_URI) {
  throw new Error("Thiếu MONGODB_URI trong .env.local.");
}

if (!ADMIN_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL.trim())) {
  throw new Error("ADMIN_EMAIL phải là email hợp lệ; đây là tên đăng nhập admin.");
}

if (
  !ADMIN_PASSWORD ||
  ADMIN_PASSWORD.length < 8 ||
  Buffer.byteLength(ADMIN_PASSWORD, "utf8") > 72
) {
  throw new Error("ADMIN_PASSWORD cần dài ít nhất 8 ký tự và tối đa 72 byte.");
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null, select: false },
    fullName: { type: String, required: true, trim: true },
    googleId: { type: String, default: null, sparse: true },
    avatar: { type: String, default: null },
    role: { type: String, enum: ["admin", "client"], default: "client", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.index(
  { googleId: 1 },
  {
    name: "googleId_unique_string",
    unique: true,
    partialFilterExpression: { googleId: { $type: "string" } },
  },
);

const User = mongoose.models.User ?? mongoose.model("User", userSchema);

try {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const fullName = ADMIN_NAME?.trim() || "Quản trị viên";

  await User.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        fullName,
        passwordHash,
        role: "admin",
        isActive: true,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: false },
  );

  console.log(`Đã tạo/cập nhật tài khoản admin: ${email}`);
} finally {
  await mongoose.disconnect();
}

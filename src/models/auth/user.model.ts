import mongoose, { Schema, type Document, type Model } from "mongoose";

export type UserRole = "admin" | "client";

export interface UserDocument extends Document {
  email: string;
  passwordHash?: string | null;
  fullName: string;
  googleId?: string | null;
  avatar?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["admin", "client"],
      default: "client",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const UserModel =
  (mongoose.models.User as Model<UserDocument> | undefined) ||
  mongoose.model<UserDocument>("User", UserSchema);

export default UserModel;
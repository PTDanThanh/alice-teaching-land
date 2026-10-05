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
  loginCount: number;
  lastLoginAt?: Date | null;
  totalTimeOnSiteSeconds: number;
  timeOnSiteAccountedAt?: Date | null;
  timeOnSiteTabs: Array<{
    tabId: string;
    expiresAt: Date;
  }>;
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
      default: null,
      sparse: true,
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
    loginCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    totalTimeOnSiteSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    timeOnSiteAccountedAt: {
      type: Date,
      default: null,
      select: false,
    },

    timeOnSiteTabs: {
      type: [
        {
          _id: false,
          tabId: { type: String, required: true },
          expiresAt: { type: Date, required: true },
        },
      ],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  },

);
UserSchema.index(
  { googleId: 1 },
  {
    name: "googleId_unique_string",
    unique: true,
    partialFilterExpression: {
      googleId: { $type: "string" },
    },
  },
);
const UserModel =
  (mongoose.models.User as Model<UserDocument> | undefined) ||
  mongoose.model<UserDocument>("User", UserSchema);

export default UserModel;
import "server-only";

import mongoose, { type Model, type Types } from "mongoose";

export interface SessionRecord {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  usedTokenHashes: string[];
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new mongoose.Schema<SessionRecord>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    usedTokenHashes: {
      type: [String],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session: Model<SessionRecord> =
  (mongoose.models.Session as Model<SessionRecord> | undefined) ??
  mongoose.model<SessionRecord>("Session", sessionSchema);

export default Session;
import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
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
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'student'],
      default: 'student',
    },
  },
  {
    timestamps: true,
  }
);

const UserModel =
  (mongoose.models.User as Model<UserDocument> | undefined) ||
  mongoose.model<UserDocument>('User', UserSchema);

export default UserModel;

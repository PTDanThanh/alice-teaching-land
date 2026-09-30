import 'server-only';
import mongoose, { type Mongoose } from 'mongoose';

declare global {
  var mongooseCache:
    | {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
      }
    | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI ?? '';

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI in the environment');
}

const cached = (globalThis.mongooseCache ??= {
  conn: null,
  promise: null,
});

export default async function connectToDatabase(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }) as Promise<Mongoose>;
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ Đã kết nối MongoDB thành công.');
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error('❌ Kết nối MongoDB thất bại:', error);
    throw error;
  }
}

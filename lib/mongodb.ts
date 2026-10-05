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

const cached = (globalThis.mongooseCache ??= {
  conn: null,
  promise: null,
});

export default async function connectToDatabase(): Promise<Mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in the environment');
  }

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

    const db = mongoose.connection.db;
    if (db) {
      try {
        await db.collection('users').dropIndex('googleId_1');
      } catch {
        // Ignore: the old nullable unique index may not exist; the new partial index will enforce the correct behavior.
      }
    }

    console.log('✅ Đã kết nối MongoDB thành công.');
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error('❌ Kết nối MongoDB thất bại:', error);
    throw error;
  }
}

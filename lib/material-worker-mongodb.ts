import "server-only";
import mongoose, { type Mongoose } from "mongoose";

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

export default async function connectToMaterialWorkerDatabase():
  Promise<Mongoose> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in the environment");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
      autoIndex: false,
      autoCreate: false,
    }) as Promise<Mongoose>;
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

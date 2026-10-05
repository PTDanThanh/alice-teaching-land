import mongoose from "mongoose";

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
    throw new Error("Thiếu MONGODB_URI trong .env.local.");
}

async function ensureUserIndexCleanup() {
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });

    const db = mongoose.connection.db;
    if (!db) {
        throw new Error("Không thể kết nối tới MongoDB database.");
    }

    const indexes = await db.collection("users").indexes();
    const oldIndexNames = indexes
        .map((index) => index.name)
        .filter((name) => name === "googleId_1");

    for (const indexName of oldIndexNames) {
        try {
            await db.collection("users").dropIndex(indexName);
            console.log(`Đã xoá index cũ: ${indexName}`);
        } catch (error) {
            console.warn(`Không thể xoá index ${indexName}:`, error.message ?? error);
        }
    }

    console.log("Kết thúc kiểm tra index người dùng.");
}

try {
    await ensureUserIndexCleanup();
} catch (error) {
    console.error("repair-user-indexes failed:", error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}

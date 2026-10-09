# Fix lỗi đăng ký: duplicate key trên googleId

## Vấn đề

Khi đăng ký tài khoản bằng email/password, hệ thống báo lỗi tương tự như sau:

```text
MongoServerError: E11000 duplicate key error collection: test.users index: googleId_1 dup key: { googleId: null }
```

Điều này xảy ra vì schema User đang tạo unique index trên `googleId`, nhưng các user đăng ký thường có `googleId = null`.

MongoDB coi `null` như một giá trị hợp lệ trong index unique, nên nhiều user cùng có `googleId: null` sẽ bị chặn.

---

## Nguyên nhân gốc rễ

Trong model user, phần schema ban đầu có cấu trúc tương tự:

```ts
googleId: {
  type: String,
  unique: true,
  sparse: true,
  default: null,
}
```

Về mặt kỹ thuật, đây là vấn đề vì:

- user đăng ký email/password không có Google account nên `googleId` bằng `null`
- unique index trên `googleId` vẫn được đánh dấu cho `null`
- MongoDB không cho phép nhiều document có cùng `googleId: null` khi index unique được tạo

---

## Cách fix đúng

Cấu trúc đúng phải là:

- Đăng ký thường: không lưu `googleId`
- Đăng ký Google: lưu `googleId` thật
- unique index chỉ áp dụng khi `googleId` là string, không áp dụng với `null`

Schema nên đặt như sau:

```ts
googleId: {
  type: String,
  default: null,
  sparse: true,
}
```

Và index nên là:

```ts
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
```

Điều này đồng nghĩa:

- `null` không bị xét vào unique check
- chỉ các giá trị string của `googleId` mới phải duy nhất
- Google account khác nhau có thể đăng ký đồng thời nếu `googleId` khác nhau

---

## Vấn đề với Mongo index cũ

Nếu database đã được tạo trước khi fix, MongoDB có thể vẫn giữ index cũ có tên `googleId_1`.

Đây là index cũ gây chặn đăng ký mới dù schema code đã sửa.

Do đó cần xoá index cũ bằng lệnh:

```bash
db.users.dropIndex("googleId_1")
```

Hoặc dùng script trong project:

```bash
npm run db:repair-user-indexes
```

---

## Script sửa index cũ

File: `scripts/repair-user-indexes.mjs`

Nội dung chính:

```js
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
}
```

---

## File đã sửa liên quan

- `src/models/auth/user.model.ts`
- `lib/mongodb.ts`
- `scripts/create-admin.mjs`
- `scripts/repair-user-indexes.mjs`
- `package.json`

---

## Xác nhận hoạt động

Sau khi fix, build project thành công:

```bash
npm run build
```

Kết quả:

```text
✓ Compiled successfully
```

Và kiểm tra index MongoDB sau khi repair script chạy, index cũ đã biến mất, chỉ còn index mới đúng cấu hình:

```json
{
  "name": "googleId_unique_string",
  "unique": true,
  "partialFilterExpression": {
    "googleId": {
      "$type": "string"
    }
  }
}
```

---

## Kết luận

Vấn đề không nằm ở form đăng ký, mà nằm ở schema MongoDB và index cũ. Khi `googleId` bằng `null`, index unique không được phép chặn các user email/password khác nhau. Fix đúng là chỉ unique khi `googleId` là string thật, đồng thời xoá index cũ trong MongoDB.

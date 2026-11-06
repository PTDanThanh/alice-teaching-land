# Alice In Teachingland — Flashcard Admin + MongoDB patch

## Phạm vi
- Giữ nguyên code hiện tại; chỉ **thêm** model, validation, API và trang Admin tại route sidebar có sẵn `/admin/pages/flashcard`.
- Admin CRUD bộ thẻ, trạng thái draft/published, thứ tự và 5 chế độ: Flashcards, Learn, Test, Match, Spell (cần kiểm thử).
- Public API `GET /api/flashcards` và `GET /api/flashcards/[slug]` chỉ trả bộ thẻ published.
- Chưa tự động thay thế hai component public đang dùng `quizletSets`. Đây là giai đoạn Admin + DB; kết nối giao diện học cần làm sau khi thử CRUD và nhập dữ liệu.

## Cài đặt
1. Chép các file theo đúng đường dẫn trong patch vào dự án.
2. Không cần cài thêm npm package nếu dự án đã có `mongoose`, `next`, `react`.
3. Giữ `MONGODB_URI` hiện có, tuyệt đối không đưa vào Git.
4. Chạy `npx tsc --noEmit` và `npm run dev` từ thư mục gốc dự án.
5. Đăng nhập Admin, vào `/admin/pages/flashcard`, tạo bộ thẻ; nhập URL nhúng của từng chế độ lấy từ Quizlet.
6. Kiểm tra `/api/flashcards` chỉ trả bộ thẻ published. Kiểm tra người dùng thường không gọi được `/api/admin/flashcards`.

## Lưu ý
- Chỉ nhận URL HTTPS trên `quizlet.com`, không lưu HTML tùy ý.
- Slug không được trùng và nên giữ cố định sau khi chia sẻ link.
- Tài liệu đính kèm chỉ có các thư mục source, không có package.json/tsconfig hoặc .env; chưa thể chạy build thật trên toàn dự án.
- Không tự động deploy lên Vercel hay đụng vào production DB.
- Trước khi tích hợp public UI, nên nhập dữ liệu từ `data/quizlet-sets.ts` bằng form Admin, tránh làm mất bộ thẻ đang hiển thị.

# KIẾN TRÚC XÂY DỰNG HỆ THỐNG ADMIN QUẢN LÝ ACTIVITY

**Dự án:** Alice In Teachingland  
**Phạm vi:** Quản trị bài viết và hiển thị tại `/activities`  
**Tài liệu tham chiếu:** `posts.zip`, `activities.zip` do người dùng cung cấp  
**Trạng thái:** Đề xuất triển khai, **chưa chỉnh sửa mã nguồn dự án**.

## 1. Mục tiêu

- Admin tạo, chỉnh sửa, lưu nháp, xuất bản, gỡ xuất bản và xóa bài viết Activity.
- Bài viết gồm tiêu đề, slug, tóm tắt, danh mục, ảnh bìa, nội dung nhiều đoạn, bài nổi bật, ngày đăng.
- Trang `/activities` và `/activities/[slug]` đọc từ MongoDB, chỉ công khai bài `published`.
- Giữ giao diện công khai hiện có; tham khảo cách tổ chức trang quản trị trong `posts.zip`.
- Tái sử dụng kết nối MongoDB, phiên đăng nhập và phân quyền **nếu các module tương ứng tồn tại trong repo đích**.

## 2. Kết quả khảo sát file nguồn

### 2.1. `activities.zip`

| File đã có trong ZIP | Vai trò hiện tại | Thay đổi đề xuất |
|---|---|---|
| `activities/page.tsx` | Metadata và render `<ActivityFeed />` | Chuyển thành Server Component lấy bài đã đăng rồi truyền props xuống feed, hoặc dùng server service |
| `activities/activity-feed.tsx` | Giao diện banner, bộ lọc `all/learning/sharing`, bài nổi bật, danh sách | Bỏ import dữ liệu tĩnh; nhận `posts` và `featuredPost` qua props; giữ style |
| `activities/[slug]/page.tsx` | Chi tiết bài, `generateMetadata`, render nội dung dạng sections | Truy vấn DB theo slug và `published`, dùng `notFound()` khi không có; render nội dung an toàn |

**Phụ thuộc hiện tại:** `@/data/activities` cung cấp `activityPosts`, `featuredActivitySlug`, `getActivityBySlug`, `activityCategoryLabels`, `formatActivityDate`, `ActivityCategory`, `ActivityPost`. Cần di chuyển kiểu dữ liệu và các hàm định dạng sang module dùng chung trước khi bỏ dữ liệu mẫu.

**Định dạng nội dung hiện tại:** `post.content.map(section => ...)` với `section.heading`, `section.text`. Đây là lý do nên ưu tiên trình soạn thảo **nhiều section** ở giai đoạn đầu để tương thích UI. Rich Text Editor có thể bổ sung ở giai đoạn sau.

### 2.2. `posts.zip`

| File đã có trong ZIP | Vai trò | Cách tham khảo |
|---|---|---|
| `posts/page.tsx` | Kiểm tra `getCurrentSessionUser()` + `PERMISSIONS.POST_VIEW`; query `Post.find()`, sort và populate tác giả; render `PostsAdminPage` | Mẫu trang danh sách quản trị |
| `posts/create/page.tsx` | Kiểm tra đăng nhập + `POST_CREATE`; render `CreatePostForm` | Mẫu trang tạo bài |
| `posts/[id]/page.tsx` | Kiểm tra `POST_UPDATE`; tìm bài bằng ObjectId, xử lý media; render `PostForm` | Mẫu trang chỉnh sửa |

**Lưu ý:** ZIP `posts.zip` **không chứa** các component `posts-chart`, `create-post-form`, `post-form`, model `Post`, API, media helpers hay định nghĩa permission. Không thể sao chép nguyên hệ thống Posts từ ZIP này; cần đối chiếu các module thực tế trong repository trước khi tích hợp.

## 3. Kiến trúc tổng quan

```text
Admin Browser
  └── /admin/activities
       ├── Danh sách / tìm kiếm / lọc
       ├── /create  → Form tạo bài
       └── /[id]    → Form chỉnh sửa
             │
             ▼
       /api/admin/activities
       /api/admin/activities/[id]
             │
             ├── Kiểm tra session + permission trên SERVER
             ├── Validate + chuẩn hóa dữ liệu
             └── Mongoose → MongoDB (ActivityPost)

Public Browser / SEO
  ├── /activities        → Server query bài published
  └── /activities/[slug] → Server query bài published theo slug
             │
             └── Shared server service → MongoDB
```

**Quyết định thiết kế:** Trang công khai ưu tiên truy vấn server trực tiếp qua service để phục vụ SEO; không cần gọi HTTP API từ Server Component. Public API `/api/activities` chỉ tạo khi có nhu cầu từ client/mobile.

## 4. Danh sách file cần bổ sung

> Đường dẫn giả định dự án dùng `app/`, `components/`, `models/`, `lib/`. Nếu repository đang dùng `src/` hoặc route group, đặt tương ứng. Không tạo trùng module đã có.

| Trạng thái | Đường dẫn đề xuất | Trách nhiệm |
|---|---|---|
| **Tạo mới** | `models/ActivityPost.ts` | Schema + index MongoDB |
| **Tạo mới** | `types/activity.ts` | DTO, form input, enum danh mục/trạng thái |
| **Tạo mới** | `lib/activities/validation.ts` | Validate/normalize payload, slug, nội dung |
| **Tạo mới** | `lib/activities/service.ts` | Query bài published, danh sách admin, lấy chi tiết |
| **Tạo mới** | `lib/activities/permissions.ts` *(nếu cần)* | Adapter cho permission hiện có; không tạo auth mới |
| **Tạo mới** | `app/admin/activities/page.tsx` | Danh sách bài, kiểm tra quyền xem |
| **Tạo mới** | `app/admin/activities/create/page.tsx` | Trang tạo, kiểm tra quyền tạo |
| **Tạo mới** | `app/admin/activities/[id]/page.tsx` | Trang sửa, kiểm tra quyền sửa |
| **Tạo mới** | `components/admin/activities/activity-admin.tsx` | Bảng, tìm kiếm, lọc trạng thái, thao tác |
| **Tạo mới** | `components/admin/activities/activity-form.tsx` | Form dùng chung tạo/sửa, lưu nháp, đăng bài |
| **Tạo mới** | `components/admin/activities/activity-section-editor.tsx` | Thêm/xóa/sắp xếp section heading/text |
| **Tạo mới** | `app/api/admin/activities/route.ts` | GET danh sách, POST tạo |
| **Tạo mới** | `app/api/admin/activities/[id]/route.ts` | GET chi tiết, PATCH sửa/trạng thái, DELETE xóa |
| **Tùy chọn** | `app/api/admin/activities/[id]/publish/route.ts` | Tách endpoint publish nếu cần workflow riêng; không bắt buộc |
| **Tùy chọn** | `app/api/admin/activities/upload/route.ts` | Upload ảnh nếu repo chưa có media API dùng chung |
| **Tùy chọn** | `app/api/activities/route.ts` | Public API danh sách khi cần fetch client |
| **Tùy chọn** | `app/api/activities/[slug]/route.ts` | Public API chi tiết khi cần fetch client |

## 5. File hiện có cần chỉnh sửa

| Đường dẫn | Thay đổi tối thiểu |
|---|---|
| `app/activities/page.tsx` | Fetch danh sách `published` từ service, truyền props cho `ActivityFeed`; giữ metadata và bố cục |
| `app/activities/activity-feed.tsx` | Thay `activityPosts` và `getActivityBySlug()` tĩnh bằng props; lọc `learning/sharing` ở client như hiện tại |
| `app/activities/[slug]/page.tsx` | Thay `getActivityBySlug()` bằng query DB; cập nhật `generateMetadata`; render nội dung theo cấu trúc mới |
| `data/activities.ts` *(nếu có)* | Chỉ giữ label, format date, hoặc chuyển sang `lib/activities/constants.ts`; không xóa ngay khi chưa xử lý hết imports |
| Layout/sidebar Admin hiện có | Thêm menu **Quản lý Activity** dẫn đến `/admin/activities`, có kiểm tra quyền |
| `lib/auth/permissions.ts` *(nếu có)* | Thêm quyền Activity riêng nếu hệ thống hỗ trợ; nếu dùng quyền Post chung phải có quyết định rõ ràng |
| Role/permission seed *(nếu có)* | Cấp quyền cho vai trò Admin tương ứng |
| `next.config.*` *(nếu cần)* | Khai báo nguồn ảnh từ storage ngoài theo chính sách `next/image` |

**Không nên chỉnh:** Module Flashcards, Quizlet, logic phân quyền của tính năng khác, hoặc giao diện Activity không liên quan.

## 6. MongoDB model đề xuất

Collection: `activityposts` (Mongoose model `ActivityPost`).

```ts
type ActivityCategory = "learning" | "sharing";
type ActivityStatus = "draft" | "published";

type ActivitySection = {
  id: string;       // key ổn định khi chỉnh sửa/sắp xếp
  heading: string;
  text: string;
};

type ActivityPost = {
  title: string;
  slug: string;             // unique, lowercase
  excerpt: string;
  category: ActivityCategory;
  image?: string;           // URL/path ảnh đã upload
  imageAlt?: string;
  content: ActivitySection[];
  status: ActivityStatus;
  featured: boolean;
  authorId?: string;        // liên kết user nếu hệ thống có
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
```

**Indexes:** `slug` unique; `{status:1,publishedAt:-1}`; `{status:1,category:1,publishedAt:-1}`. Nếu chỉ một bài nổi bật, enforce bằng logic transaction/atomic update hoặc quy tắc chọn một bài khi đọc; không tin vào checkbox client.

**Quy tắc dữ liệu:**
- Slug chỉ gồm chữ thường ASCII, số, dấu `-`; kiểm tra trùng ở DB và trả HTTP 409.
- Không cho xuất bản nếu thiếu title, excerpt, category hợp lệ hoặc không có section nội dung hợp lệ.
- `publishedAt` đặt khi xuất bản lần đầu; cập nhật bài không tự thay đổi ngày đăng.
- Gỡ đăng chuyển `status` về `draft`; bài biến mất khỏi public ngay sau khi cache được làm mới.
- `featured` chỉ có hiệu lực khi `published`.
- `authorId` lấy từ session server, không nhận tùy ý từ request body.

## 7. API contract

| Method | Endpoint | Quyền | Kết quả |
|---|---|---|---|
| GET | `/api/admin/activities` | `ACTIVITY_VIEW` | Danh sách có phân trang, filter, search |
| POST | `/api/admin/activities` | `ACTIVITY_CREATE` | Tạo bài draft/published theo payload hợp lệ |
| GET | `/api/admin/activities/[id]` | `ACTIVITY_VIEW` | Chi tiết bài cho Admin |
| PATCH | `/api/admin/activities/[id]` | `ACTIVITY_UPDATE` | Cập nhật nội dung, trạng thái, featured |
| DELETE | `/api/admin/activities/[id]` | `ACTIVITY_DELETE` | Xóa bài (nên xác nhận trước) |

Quyền `ACTIVITY_*` là **tên đề xuất**, không khẳng định đã tồn tại. Cần kiểm tra mô hình role/permission thật trước khi triển khai.

**HTTP:** 400 invalid input, 401 chưa đăng nhập, 403 thiếu quyền, 404 không tìm thấy, 409 trùng slug, 500 lỗi server. Route Handler phải kiểm tra quyền lại, không dựa vào ẩn nút ở client. GET public chỉ lọc `status: "published"`; không lộ nháp.

**Ví dụ payload POST/PATCH:**

```json
{
  "title": "5 hoạt động học tiếng Anh tại nhà",
  "slug": "5-hoat-dong-hoc-tieng-anh-tai-nha",
  "excerpt": "Những hoạt động đơn giản để luyện tập mỗi ngày.",
  "category": "learning",
  "image": "/uploads/activities/example.webp",
  "imageAlt": "Học sinh tham gia hoạt động học tập",
  "content": [
    {"id":"intro","heading":"Giới thiệu","text":"Nội dung mở đầu..."},
    {"id":"tips","heading":"Cách thực hiện","text":"Các bước thực hiện..."}
  ],
  "status": "draft",
  "featured": false
}
```

## 8. Giao diện Admin

### 8.1. Trang danh sách `/admin/activities`
- Header **Quản lý Activity** + nút **Viết bài mới**.
- Thống kê tổng, đã đăng, bản nháp (lấy số thật từ API, không hardcode).
- Tìm kiếm theo title/slug; lọc danh mục và trạng thái; phân trang.
- Bảng: ảnh bìa, tiêu đề, danh mục, trạng thái, ngày cập nhật, tác giả (nếu có), hành động.
- Hành động: xem trước, sửa, xuất bản/gỡ đăng, xóa có xác nhận.

### 8.2. Trang tạo/chỉnh sửa
- Tiêu đề, slug tự đề xuất từ tiêu đề nhưng cho sửa thủ công.
- Tóm tắt, danh mục `learning`/`sharing`, ảnh bìa + alt text.
- Editor section: thêm, xóa, sắp xếp các cặp **heading + text** (khớp Activity UI hiện tại).
- Bài nổi bật; nút **Lưu bản nháp**, **Xuất bản**, **Xem trước**, **Hủy**.
- Thông báo thành công/thất bại, cảnh báo khi rời trang với thay đổi chưa lưu.
- Phân quyền nút phù hợp với quyền người dùng.

**Rich text:** `posts.zip` chỉ tham chiếu `PostForm`, không chứa implementation editor. Không thể xác nhận thư viện đang dùng. Giai đoạn 1 dùng section editor; giai đoạn 2 có thể dùng Tiptap hoặc editor hiện có sau khi kiểm tra dependencies. Nếu chuyển sang HTML/JSON rich text, phải cập nhật model, validation và renderer, tránh `dangerouslySetInnerHTML` với nội dung chưa sanitize.

## 9. Media và ảnh bìa

`posts/[id]/page.tsx` tham chiếu hệ thống `Media`, `filesystem-media`, `serialize-media`, `storage-path`, nhưng các module đó **không có trong ZIP**. Cần kiểm tra repo có sẵn media/upload API không.

Ưu tiên dùng chung upload/media hiện có; lưu URL hoặc media ID theo convention của repo. Không lưu file nhị phân trực tiếp vào document MongoDB. Validate MIME, kích thước, quyền upload và xử lý URL an toàn. Nếu dùng storage cloud, kiểm tra domain cho `next/image`.

## 10. Quy trình hoạt động

1. Admin đăng nhập → truy cập `/admin/activities` → server kiểm tra session và quyền.
2. Bấm **Viết bài mới** → nhập metadata, ảnh và sections.
3. **Lưu bản nháp** → POST status `draft` → chỉ Admin nhìn thấy.
4. **Xuất bản** → validate đầy đủ → status `published`, đặt `publishedAt` → revalidate `/activities` và `/activities/[slug]` nếu có cache.
5. Trang công khai lấy bài `published`; danh sách lọc danh mục và chọn bài nổi bật.
6. Admin sửa bài → PATCH → làm mới cache liên quan, bao gồm slug cũ nếu slug thay đổi.
7. Gỡ bài → PATCH status `draft` → đường dẫn công khai trả 404 sau khi cache cập nhật.
8. Xóa bài → DELETE có xác nhận → loại khỏi danh sách; xử lý ảnh dùng chung thận trọng, không xóa ảnh đang được bài khác sử dụng.

## 11. Quy tắc bảo mật, SEO và hiệu năng

- Xác thực và phân quyền **ở server page lẫn API**, không chỉ client.
- Kiểm tra input, slug và ownership/permission theo chính sách repo.
- Public không trả bài nháp, kể cả khi biết slug.
- Chống XSS cho rich text, kiểm tra URL ảnh, giới hạn payload.
- Có pagination và index DB; tránh tải toàn bộ bài lên client khi dữ liệu tăng.
- `generateMetadata()` lấy title/excerpt của bài published; có canonical URL nếu site cấu hình base URL.
- Dùng `revalidatePath()` hoặc chiến lược cache phù hợp sau publish/edit/unpublish; đảm bảo danh sách và trang chi tiết không bị stale.
- Tránh `JSON.parse(JSON.stringify(...))` tùy tiện ở nhiều nơi; chuẩn hóa Mongoose document thành DTO trong một helper.

## 12. Lộ trình triển khai

| Giai đoạn | Công việc | Điều kiện hoàn thành |
|---|---|---|
| **0. Đối chiếu repo** | Kiểm tra thư mục app, auth, permissions, db, media, UI components, package.json | Chốt đường dẫn và khả năng tái sử dụng |
| **1. Dữ liệu** | Model, types, validation, service | Tạo và truy vấn bài từ MongoDB |
| **2. API** | Admin GET/POST/PATCH/DELETE + kiểm tra quyền | Test 401/403/404/409 và CRUD |
| **3. Admin UI** | Danh sách, tạo/sửa, section editor, upload | Lưu nháp và đăng bài qua giao diện |
| **4. Public UI** | Chuyển Activity sang dữ liệu DB, giữ layout | Bài published hiển thị đúng, draft ẩn |
| **5. Hoàn thiện** | SEO, cache, migration, tests, responsive | Build/lint/test đạt, không ảnh hưởng Flashcards |

## 13. Di chuyển dữ liệu cũ

- Kiểm tra `data/activities.ts` trong repo thật và đối chiếu shape.
- Viết script migration **chạy một lần**, map `title/slug/excerpt/category/image/content/updatedAt` sang model mới.
- Giữ slug cũ để URL đã chia sẻ không bị hỏng; đảm bảo idempotent (upsert theo slug).
- Xác định bài nào đã public, bài nào featured; không tự động public tất cả nếu chưa xác nhận.
- Sao lưu trước khi chạy; kiểm tra số lượng, slug trùng và ảnh hợp lệ.
- Chỉ bỏ import dữ liệu tĩnh sau khi xác minh trang công khai hoạt động với DB.

## 14. Checklist kiểm thử

- [ ] Người chưa đăng nhập không truy cập được Admin/API ghi.
- [ ] Người thiếu quyền không thể tạo/sửa/xóa dù gọi API trực tiếp.
- [ ] Tạo nháp thành công và không xuất hiện trên `/activities`.
- [ ] Xuất bản hiển thị trên danh sách và `/activities/[slug]`.
- [ ] Bài nổi bật hiển thị đúng; không bị lặp trong danh sách thường.
- [ ] Lọc `learning` và `sharing` chính xác.
- [ ] Chỉnh sửa bài cập nhật nội dung và metadata.
- [ ] Gỡ đăng/xóa khiến public không còn truy cập được.
- [ ] Slug trùng trả 409; slug sai trả 400.
- [ ] Ảnh bìa hoạt động trên local và production.
- [ ] XSS/URL không an toàn bị chặn hoặc sanitize.
- [ ] Responsive trên mobile/tablet/desktop.
- [ ] `tsc`, lint, build và smoke test đều đạt.

## 15. Các quyết định cần chốt trước khi code

1. **Vị trí thư mục thật:** `app/` hay `src/app/`, có route group không?
2. **Auth:** Repo có `getCurrentSessionUser`, `PERMISSIONS` và role seeding giống `posts.zip` hay dùng cơ chế khác?
3. **Nội dung:** Giữ editor theo sections (khuyến nghị giai đoạn đầu) hay yêu cầu rich text ngay?
4. **Ảnh:** Dùng media library/upload có sẵn hay cần xây thêm?
5. **Xóa:** Hard delete hay soft delete/archive?
6. **Featured:** Chỉ một bài nổi bật hay nhiều bài?

**Nguyên tắc triển khai:** Không thay thế nguyên file lớn khi không cần; chỉnh tối thiểu, chú thích `//` tại các phần logic mới; giữ layout Activity hiện tại; không ảnh hưởng Admin Flashcards và các chức năng khác.

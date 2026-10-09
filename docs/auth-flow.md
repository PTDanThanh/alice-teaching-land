# Cấu trúc đăng ký, đăng nhập và tích hợp Axios

## 1. Mục tiêu

Tài liệu này mô tả luồng xác thực của dự án: đăng ký, đăng nhập, xác thực phiên, và cách client gọi API bằng Axios.

## 2. Cấu trúc thư mục liên quan

- `app/api/login/route.ts` : route xử lý đăng nhập trên server
- `app/api/logout/route.ts` : route xử lý đăng xuất trên server
- `app/api/me/route.ts` : kiểm tra thông tin người dùng đang đăng nhập
- `app/api/register/route.ts` : route xử lý đăng ký tài khoản
- `lib/auth/http.ts` : helper server-side cho auth (AuthError, json, checkOrigin, errorResponse)
- `lib/auth/tokens.ts` : tạo, xác thực, lưu cookie access/refresh token
- `services/auth/auth.service.ts` : logic nghiệp vụ đăng nhập, đăng ký, refresh, logout
- `lib/http.ts` : instance Axios dùng cho client
- `components/auth/*` : form đăng nhập, đăng ký và header auth UI

## 3. Luồng đăng ký

### Client

- Form đăng ký gửi dữ liệu từ `components/auth/register-form.tsx`
- Gọi hàm `register(...)` trong `lib/api/auth.ts`

### API client

`lib/api/auth.ts` sử dụng Axios instance từ `lib/http.ts`:

```ts
const { data } = await apiClient.post("/api/register", {
  fullName,
  email,
  password,
});
```

### Server

`app/api/register/route.ts` thực hiện:

1. Kiểm tra origin
2. Kiểm tra `Content-Type: application/json`
3. Parse request body
4. Gọi `register(body)` từ `services/auth/auth.service.ts`
5. Tạo session mới
6. Set cookie access token + refresh token
7. Trả về response JSON

### Business logic

Trong `services/auth/auth.service.ts`:

- validate `fullName`, `email`, `password`
- kiểm tra email đã tồn tại
- hash mật khẩu bằng `bcryptjs`
- lưu user vào MongoDB
- tạo session và JWT
- trả về `user`, `accessToken`, `refreshToken`, `expiresAt`

## 4. Luồng đăng nhập

### Client

- Form đăng nhập ở `components/auth/login-form.tsx`
- Gọi `authService.login(data)` trong `services/auth.service.ts`

### Client HTTP

`services/auth.service.ts`:

```ts
const { data: payload } = await apiClient.post("/api/login", data);
```

### Server

`app/api/login/route.ts`:

1. validate JSON body
2. gọi `login(body)` từ `services/auth/auth.service.ts`
3. tạo session mới
4. set cookies auth
5. trả về user đã login

### Business logic

`login(body)` thực hiện:

- validate email/password
- kiểm tra tồn tại user trong MongoDB
- so sánh password bằng bcrypt
- kiểm tra `isActive`
- tạo access token + refresh token
- trả về dữ liệu session

## 5. Xác thực phiên sau login

Sau khi login, UI cần kiểm tra trạng thái người dùng hiện tại qua `HeaderAuth`.

`components/auth/header-auth.tsx`:

- gọi `GET /api/me`
- nếu token hết hạn, thử refresh bằng `POST /api/auth/refresh`
- nếu refresh thành công, gọi lại `/api/me`
- nếu không, set `user = null`

`app/api/me/route.ts`:

- đọc cookie access token
- gọi `currentUser()` từ `services/auth/auth.service.ts`
- nếu hợp lệ, trả `{ user }`
- nếu không, trả 401 hoặc message lỗi

## 6. Tích hợp Axios

### File client HTTP

`lib/http.ts` là nơi quản lý instance Axios dùng chung:

```ts
export const apiClient = axios.create({
  baseURL: "/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### Tại sao dùng Axios

- gọi API dễ đọc hơn `fetch`
- xử lý lỗi tập trung ở interceptor
- có thể gắn `withCredentials` cho cookie auth
- chuẩn hóa lỗi thành `Error(message)`

### Interceptor

Trong `lib/http.ts`:

- nếu response thành công thì trả về nguyên response
- nếu error thì đọc `error.response.data.message` và ném lại message rõ ràng

Điều này giúp client không phải viết lại logic xử lý lỗi ở mỗi component.

## 7. Mối quan hệ giữa client và server

- Frontend không gọi MongoDB trực tiếp
- Frontend chỉ gọi các route Next.js như `/api/login`, `/api/register`, `/api/me`, `/api/logout`
- Server xử lý logic xác thực và session
- Cookie lưu token ở browser để request sau tự động gửi kèm

## 8. Lưu ý quan trọng

- `lib/auth/http.ts` là server-side helper, không dùng cho client
- `lib/http.ts` là client-side axios instance, không dùng cho server route
- nếu gọi `fetch` hoặc Axios sai endpoint hoặc sai format response, UI sẽ báo lỗi ngay dù login đã thành công
- cần luôn đồng bộ route và response contract giữa client và server

## 9. Kết luận

Cấu trúc hiện tại chia thành hai tầng rõ ràng:

1. Server-side auth layer: xác thực, token, session, cookie
2. Client-side HTTP layer: gọi API bằng Axios, chuẩn hóa lỗi, kiểm tra trạng thái đăng nhập

Nhờ cách tách này, dự án dễ mở rộng cho các tính năng mới như reset password, email verification, refresh token, và OAuth.

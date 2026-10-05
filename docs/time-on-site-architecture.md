# Time on Site Architecture

## Mục tiêu

Hệ thống theo dõi thời gian người dùng đang ở trên website và lưu tổng thời gian hoạt động vào MongoDB. Mục tiêu là:

1. biết user đang online hay không
2. ghi nhận thời gian thực tế họ đang mở tab
3. tránh cộng thời gian khi tab ẩn, background, hoặc không còn active
4. lưu dữ liệu theo user để dùng cho dashboard/admin hoặc profile cá nhân

---

## Luồng hoạt động

### 1. Client tracker chạy ở root app

File:
- `components/analytics/time-on-site.tsx`

Component này chạy ở root layout và theo dõi các sự kiện:

- `visibilitychange`
- `pagehide`
- `pageshow`
- setTimeout heartbeat 30 giây

Mỗi tab sẽ tạo một `tabId` ngẫu nhiên bằng `crypto.randomUUID()`.

Khi tab đang visible, client sẽ gửi request lên API:

- `POST /api/analytics/time-on-site`

Payload mẫu:

```json
{
  "tabId": "uuid-here",
  "event": "heartbeat"
}
```

hoặc:

```json
{
  "tabId": "uuid-here",
  "event": "stop"
}
```

---

### 2. API route xác thực và nhận dữ liệu

File:
- `app/api/analytics/time-on-site/route.ts`

Route có nhiệm vụ:

- kiểm tra origin
- đọc user hiện tại từ cookie/session
- validate dữ liệu `tabId` và `event`
- gọi service lưu thời gian

Nếu user chưa đăng nhập, route sẽ bỏ qua và trả về `success: true, skipped: true` thay vì báo lỗi 401.

Điều này quan trọng vì tracker chạy ở nhiều page, không phải chỉ ở user đã login.

---

### 3. Service tính thời gian hoạt động

File:
- `services/analytics/time-on-site.services.ts`

Service này thực hiện việc cộng thời gian chưa được ghi nhận vào `totalTimeOnSiteSeconds`.

#### Cách hoạt động:

- đọc danh sách `timeOnSiteTabs` hiện có trong user document
- xác định mốc thời gian bắt đầu tính (`timeOnSiteAccountedAt`)
- tìm thời điểm chốt cuối cùng của các tab còn hoạt động (`_tosUntil`)
- tính khoảng thời gian từ `timeOnSiteAccountedAt` tới `NOW` nhưng chỉ cộng phần chưa được tính trước đó
- cập nhật lại:
  - `totalTimeOnSiteSeconds`
  - `timeOnSiteAccountedAt`
  - `timeOnSiteTabs`

#### Mỗi tab lưu gì?

```ts
{
  tabId: string,
  expiresAt: Date
}
```

`expiresAt` được cập nhật khi heartbeat tiếp tục, và nếu tab không hoạt động nữa thì sẽ bị loại khỏi danh sách.

---

## Dữ liệu lưu trong MongoDB

File:
- `src/models/auth/user.model.ts`

Các field quan trọng:

```ts
loginCount: number;
lastLoginAt?: Date | null;
totalTimeOnSiteSeconds: number;
timeOnSiteAccountedAt?: Date | null;
timeOnSiteTabs: Array<{
  tabId: string;
  expiresAt: Date;
}>;
```

### Ý nghĩa:

- `loginCount`: số lần đăng nhập thành công
- `lastLoginAt`: thời điểm đăng nhập cuối
- `totalTimeOnSiteSeconds`: tổng thời gian user đã ở trên website
- `timeOnSiteAccountedAt`: thời điểm tính toán cuối cùng đã được cộng
- `timeOnSiteTabs`: danh sách tab đang active và thời gian hết hạn tương ứng

---

## Tại sao không cộng tất cả thời gian mỗi lần?

Vì tab có thể:

- bị ẩn
- không active
- đóng browser
- reload
- mất kết nối

Nếu cộng trực tiếp từng request mà không kiểm tra lại mốc thời gian, sẽ dễ bị nhân đôi hoặc cộng sai khi tab chuyển trạng thái.

Do đó, hệ thống dùng cơ chế:

- lưu tab trạng thái
- tính phần chênh lệch chưa ghi nhận
- cập nhật lại `timeOnSiteAccountedAt`

---

## Dashboard admin

File:
- `app/(dashboard)/admin/users/page.tsx`

Trang admin đọc dữ liệu user từ `/api/admin/users` và hiển thị:

- số lần đăng nhập
- thời gian truy cập
- vai trò, trạng thái, email, v.v.

Dữ liệu hiển thị thời gian hoạt động có dạng:

```ts
formatTimeOnSite(totalSeconds)
```

Ví dụ:

- 834.0959999999999 giây → `0 giờ 13 phút 54 giây`

Tùy cách định dạng, có thể đổi sang `HH:mm:ss` nếu muốn sau này.

---

## Ghi nhớ quan trọng

- Đây là tracking thời gian hoạt động của user trên website, không phải session login.
- Tracker phải chạy ở root app để theo dõi toàn bộ app, không chỉ 1 page.
- Dữ liệu lưu trong MongoDB theo `User` document, không tạo collection riêng.
- `timeOnSiteTabs` và `timeOnSiteAccountedAt` là hai mấu chốt để tránh tính trùng thời gian.

---

## Các file liên quan

- `components/analytics/time-on-site.tsx`
- `app/api/analytics/time-on-site/route.ts`
- `services/analytics/time-on-site.services.ts`
- `src/models/auth/user.model.ts`
- `app/(dashboard)/admin/users/page.tsx`
- `app/api/admin/users/route.ts`

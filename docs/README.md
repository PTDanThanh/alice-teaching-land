# Đồng bộ tài liệu Admin ↔ Trang chủ ↔ Thư viện

## Copy file
Copy các thư mục `app`, `components`, `data`, `lib`, `models` vào đúng root dự án Next.js. File `components/materials/MaterialLibrary.tsx` là bản đã thay nguồn dữ liệu tĩnh bằng hook `usePublicMaterials`; thay thế file MaterialLibrary hiện tại tại vị trí import đang dùng (không nhất thiết nằm trong components/materials). Đảm bảo component Pagination tại `@/components/ui/pagination` đã có.

## Cấu hình bắt buộc
1. `npm install mongoose` nếu chưa có.
2. Thêm `MONGODB_URI=...` vào `.env.local` (không commit).
3. **BẮT BUỘC** chỉnh `lib/materials-admin-auth.ts` để xác thực session/role Admin thực tế. File mặc định trả `false` (HTTP 403) để tránh mở API ghi công khai. Chưa có code auth của dự án nên không thể tự đoán.
4. Các trang Admin `/admin/materials` và `/admin/pages/materials` cùng dùng `components/admin/materials-admin.tsx` và API `/api/admin/materials`.
5. Trang chủ gọi `usePublicMaterials(true)` để lấy tài liệu `published && showOnHome`. Thư viện dùng `usePublicMaterials(false)` để lấy toàn bộ tài liệu `published`.
6. Xóa phụ thuộc `initialDocuments` của trang Admin cũ. Không cần xóa `data/document-content.ts` nếu còn thành phần khác đang dùng.

## Ví dụ trang chủ
```tsx
"use client";
import { usePublicMaterials } from "@/components/materials/use-public-materials";
export default function HomeDocuments() {
  const { materials, loading, error } = usePublicMaterials(true);
  if (loading) return <p>Đang tải...</p>;
  if (error) return <p>{error}</p>;
  return <div>{materials.map(item => <a key={item.id} href={`/materials/${item.id}`}>{item.title}</a>)}</div>;
}
```

## Giới hạn
- Chưa upload file nhị phân: form nhập URL HTTPS đến file đã được upload vào storage. Không dùng URL `#`.
- API public chỉ trả tài liệu xuất bản. API Admin yêu cầu quyền Admin. Có kiểm tra dữ liệu đầu vào.
- `getMaterialById()` cũ tra mảng tĩnh nên không tìm được tài liệu DB. Trang `/materials/[id]` phải được chuyển sang truy vấn DB/public API riêng.
- Chưa migration từ `initialDocuments`: theo yêu cầu bỏ dữ liệu mẫu, database khởi đầu rỗng.

Có sẵn `components/materials/home-documents.tsx`: đặt `<HomeDocuments />` vào khu vực tài liệu của trang chủ hiện tại. Không ghi đè cả trang chủ vì chưa có source trang chủ của dự án.

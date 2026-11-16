
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Cookie xác thực hiện tại của dự án
const ACCESS_COOKIE = "alice_access";

// Chỉ xử lý khu vực quản trị
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

// Xác minh JWT ở lớp Proxy.
// Không truy vấn MongoDB tại đây.
async function hasValidAccessToken(
  request: NextRequest,
): Promise<boolean> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!token) {
    return false;
  }

  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    // Không cho phép truy cập khi cấu hình bảo mật sai
    return false;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
        issuer: "alicetland",
        audience: "alicetland",
      },
    );

    // Kiểm tra định dạng ID giống tokens.ts
    return (
      typeof payload.sub === "string" &&
      /^[a-f0-9]{24}$/.test(payload.sub) &&
      typeof payload.sid === "string" &&
      /^[a-f0-9]{24}$/.test(payload.sid) &&
      typeof payload.exp === "number"
    );
  } catch {
    // Token sai chữ ký, hết hạn hoặc không hợp lệ
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Kiểm tra token trước khi cho phép đi tiếp
  const authenticated = await hasValidAccessToken(request);

  if (!authenticated) {
    // API phải trả JSON thay vì redirect
    if (pathname.startsWith("/api/admin/") || pathname === "/api/admin") {
      return NextResponse.json(
        { error: "Bạn chưa đăng nhập hoặc phiên đã hết hạn." },
        { status: 401 },
      );
    }

    // Trang admin chuyển về đăng nhập
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Token hợp lệ về mặt chữ ký.
  // Quyền admin và phiên MongoDB vẫn được kiểm tra ở server.
  return NextResponse.next();
}

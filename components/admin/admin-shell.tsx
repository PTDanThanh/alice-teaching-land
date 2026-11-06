"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Menu, X } from "lucide-react";

import AdminSidebar, {
  type AdminUser,
} from "@/components/admin/sidebar";

type AdminShellProps = {
  children: ReactNode;
  user: AdminUser;
};

export default function AdminShell({
  children,
  user,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const menuOpen = menuPath === pathname;

  function closeMenu() {
    setMenuPath(null);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuPath(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function handleLogout() {
    closeMenu();
    router.push("/"); // Chuyển thẳng về trang chủ website
  }

  return (
    <div className="min-h-dvh w-full bg-[#F6F7FB] text-slate-900 lg:flex">
      {/* Sidebar desktop */}
      <AdminSidebar
        user={user}
        loggingOut={loggingOut}
        logoutError={logoutError}
        onLogout={handleLogout}
        className="sticky top-0 hidden h-dvh shrink-0 lg:flex"
      />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-10">
          {/* Nhóm bên trái: Nút Menu mobile + Tiêu đề "Hệ Thống Quản Trị" */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={menuOpen}
              aria-controls="admin-mobile-navigation"
              onClick={() =>
                setMenuPath(menuOpen ? null : pathname)
              }
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-500 lg:hidden"
            >
              {menuOpen ? (
                <X aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Menu aria-hidden="true" className="h-5 w-5" />
              )}
            </button>

            <span className="text-left text-[16px] font-bold text-slate-800">
              Hệ Thống Quản Trị
            </span>
          </div>

          {/* Nhóm bên phải: Tên người dùng (trên mobile) hoặc Badge (trên desktop) */}
          <div className="flex items-center gap-3">
            <span className="max-w-48 truncate text-sm font-semibold text-slate-700 lg:hidden">
              {user.fullName}
            </span>
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
              Quản trị viên
            </span>
          </div>
        </header>

        {/* Sidebar mobile */}
        <div
          id="admin-mobile-navigation"
          hidden={!menuOpen}
          className="fixed inset-x-0 bottom-0 top-16 z-40 lg:hidden"
        >
          <AdminSidebar
            user={user}
            loggingOut={loggingOut}
            logoutError={logoutError}
            onLogout={handleLogout}
            onNavigate={closeMenu}
            className="h-full w-full"
          />
        </div>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-7 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
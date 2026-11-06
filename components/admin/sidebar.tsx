"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpenText, ChevronDown, LogOut, Pin, PinOff } from "lucide-react";

import {
  adminNavigation,
  type DashboardNavigationItem,
} from "@/lib/dashboard/navigation";

export type AdminUser = {
  fullName: string;
  email: string;
};

type AdminSidebarProps = {
  user: AdminUser;
  loggingOut: boolean;
  logoutError?: string;
  onLogout: () => void;
  onNavigate?: () => void;
  className?: string;
};

function matchesPath(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/admin" && pathname.startsWith(`${href}/`))
  );
}

function getActiveKey(
  items: DashboardNavigationItem[],
  pathname: string,
): string | null {
  let activeKey: string | null = null;
  let longestMatch = -1;

  function visit(entries: DashboardNavigationItem[]) {
    for (const item of entries) {
      if (
        item.href &&
        matchesPath(pathname, item.href) &&
        item.href.length > longestMatch
      ) {
        activeKey = item.key;
        longestMatch = item.href.length;
      }

      if (item.children) {
        visit(item.children);
      }
    }
  }

  visit(items);
  return activeKey;
}

function containsActiveItem(
  item: DashboardNavigationItem,
  activeKey: string | null,
): boolean {
  return (
    item.key === activeKey ||
    Boolean(
      item.children?.some((child) =>
        containsActiveItem(child, activeKey),
      ),
    )
  );
}

type NavigationItemProps = {
  item: DashboardNavigationItem;
  activeKey: string | null;
  pathname: string;
  onNavigate?: () => void;
  isCollapsed?: boolean;
};

function NavigationItem({
  item,
  activeKey,
  pathname,
  onNavigate,
  isCollapsed = false,
}: NavigationItemProps) {
  const branchActive = containsActiveItem(item, activeKey);

  const [expansion, setExpansion] = useState<{
    pathname: string;
    open: boolean;
  } | null>(null);

  const open =
    expansion?.pathname === pathname
      ? expansion.open
      : branchActive;

  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);
  const active = item.key === activeKey;

  const baseClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300";

  if (hasChildren) {
    const panelId = `admin-menu-${item.key}`;

    return (
      <li>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() =>
            setExpansion({ pathname, open: !open })
          }
          title={isCollapsed ? item.label : undefined}
          className={`${baseClass} ${branchActive
            ? "bg-white/10 text-white"
            : "text-violet-100 hover:bg-white/10"
            } ${isCollapsed ? "justify-center px-2" : ""}`}
        >
          {Icon && (
            <Icon
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            />
          )}

          {!isCollapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""
                  }`}
              />
            </>
          )}
        </button>

        {!isCollapsed && (
          <ul
            id={panelId}
            hidden={!open}
            className="ml-5 mt-2 space-y-1 border-l border-white/15 pl-3"
          >
            {item.children!.map((child) => (
              <NavigationItem
                key={child.key}
                item={child}
                activeKey={activeKey}
                pathname={pathname}
                onNavigate={onNavigate}
                isCollapsed={isCollapsed}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  if (!item.href) return null;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={pathname === item.href ? "page" : undefined}
        title={isCollapsed ? item.label : undefined}
        className={`${baseClass} ${active
          ? "bg-violet-600 text-white shadow-lg shadow-violet-950/20"
          : "text-violet-100 hover:bg-white/10 hover:text-white"
          } ${isCollapsed ? "justify-center px-2" : ""}`}
      >
        {Icon && (
          <Icon
            aria-hidden="true"
            className="h-5 w-5 shrink-0"
          />
        )}

        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}

export default function AdminSidebar({
  user,
  loggingOut,
  logoutError,
  onLogout,
  onNavigate,
  className = "",
}: AdminSidebarProps) {
  const pathname = usePathname();
  const activeKey = getActiveKey(adminNavigation, pathname);

  // Khởi tạo trực tiếp trạng thái ghim từ localStorage
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window === "undefined") return true;
    const savedPinState = localStorage.getItem("admin_sidebar_pinned");
    return savedPinState !== null ? savedPinState === "true" : true;
  });

  const [isHovered, setIsHovered] = useState(false);

  function togglePin() {
    const nextState = !isPinned;
    setIsPinned(nextState);
    localStorage.setItem("admin_sidebar_pinned", String(nextState));
  }

  // Nếu không ghim và không rê chuột vào thì thu gọn lại
  const isCollapsed = !isPinned && !isHovered;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: isCollapsed ? "5rem" : "18rem" }} // Dùng trực tiếp style width để ép trình duyệt co giãn chính xác 100%
      className={`flex flex-col overflow-hidden border-r border-white/10 bg-linear-to-b from-[#281955] via-[#24164B] to-[#1D143A] p-4 text-white transition-all duration-300 ease-in-out ${className}`}
    >
      {/* Header Logo */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5 ${isCollapsed ? "justify-center w-full" : "w-full"
            }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-400 to-violet-600 shadow-lg shadow-violet-950/30">
            <BookOpenText aria-hidden="true" className="h-5 w-5" />
          </span>

          {!isCollapsed && (
            <div className="truncate">
              <span className="block text-sm font-bold tracking-wide">
                Alice Studio
              </span>
              <span className="mt-0.5 block text-xs text-violet-200">
                Admin workspace
              </span>
            </div>
            
          )}
          
        </Link>
      </div>

      {/* Nút bấm Ghim / Bỏ ghim */}
      <div className={`mt-3 flex ${isCollapsed ? "justify-center" : "justify-end px-1"}`}>
        <button
          type="button"
          onClick={togglePin}
          title={isPinned ? "Bỏ ghim sidebar (Thu gọn)" : "Ghim sidebar"}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-violet-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          {isPinned ? (
            <>
              <PinOff aria-hidden="true" className="h-4 w-4 shrink-0" />
              {!isCollapsed}
            </>
          ) : (
            <>
              <Pin aria-hidden="true" className="h-4 w-4 shrink-0" />
              {!isCollapsed}
            </>
          )}
        </button>
      </div>

      {/* Danh sách Menu */}
      <div className="min-h-0 flex-1 overflow-y-auto py-3 scrollbar-none">
        <nav aria-label="Điều hướng quản trị">
          <ul className="space-y-1.5">
            {adminNavigation.map((item) => (
              <NavigationItem
                key={item.key}
                item={item}
                activeKey={activeKey}
                pathname={pathname}
                onNavigate={onNavigate}
                isCollapsed={isCollapsed}
              />
            ))}
          </ul>
        </nav>
      </div>

      {/* Footer / Thông tin tài khoản & nút quay về */}
      <div className="shrink-0 rounded-2xl border border-white/10 bg-white/6 p-3 shadow-lg shadow-black/10">
        {!isCollapsed ? (
          <div className="truncate">
            <p className="truncate text-sm font-semibold">
              {user.fullName}
            </p>
            <p className="mt-0.5 truncate text-xs text-violet-200">
              {user.email}
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title={user.fullName}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
              {user.fullName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          title="Quay về website"
          className={`mt-3 cursor-pointer flex items-center gap-2 rounded-lg py-2 text-sm text-violet-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 ${isCollapsed ? "justify-center px-0" : "w-full px-2 text-left"
            }`}
        >
          <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="truncate">{loggingOut ? "Đang tải…" : "Quay về website"}</span>}
        </button>

        {logoutError && !isCollapsed && (
          <p role="alert" className="mt-2 text-xs text-red-200">
            {logoutError}
          </p>
        )}
      </div>
    </aside>
  );
}
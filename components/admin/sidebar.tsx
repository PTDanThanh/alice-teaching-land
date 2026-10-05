"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpenText, ChevronDown, LogOut } from "lucide-react";

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
};

function NavigationItem({
  item,
  activeKey,
  pathname,
  onNavigate,
}: NavigationItemProps) {
  const branchActive = containsActiveItem(item, activeKey);

  // Lưu lựa chọn theo đường dẫn để nhóm chứa route mới tự mở.
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
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-violet-300";

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
          className={`${baseClass} ${
            branchActive
              ? "bg-white/10 text-white"
              : "text-violet-100 hover:bg-white/10"
          }`}
        >
          {Icon && (
            <Icon
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            />
          )}

          <span className="flex-1 text-left">{item.label}</span>

          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

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
            />
          ))}
        </ul>
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
        className={`${baseClass} ${
          active
            ? "bg-violet-600 text-white shadow-lg shadow-violet-950/20"
            : "text-violet-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        {Icon && (
          <Icon
            aria-hidden="true"
            className="h-5 w-5 shrink-0"
          />
        )}

        <span>{item.label}</span>
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

  return (
    <aside
      className={`flex flex-col bg-[#24164B] p-5 text-white ${className}`}
    >
      <Link
        href="/admin"
        onClick={onNavigate}
        className="flex shrink-0 items-center gap-3 rounded-lg px-2 py-3"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500">
          <BookOpenText
            aria-hidden="true"
            className="h-6 w-6"
          />
        </span>

        <span>
          <span className="block text-sm font-bold">
            Alice Studio
          </span>
          <span className="mt-0.5 block text-xs text-violet-200">
            Admin workspace
          </span>
        </span>
      </Link>

      <div className="min-h-0 flex-1 overflow-y-auto py-6">
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
          Quản trị
        </p>

        <nav aria-label="Điều hướng quản trị">
          <ul className="space-y-1.5">
            {adminNavigation.map((item) => (
              <NavigationItem
                key={item.key}
                item={item}
                activeKey={activeKey}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </nav>
      </div>

      <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="truncate text-sm font-semibold">
          {user.fullName}
        </p>

        <p className="mt-1 truncate text-xs text-violet-200">
          {user.email}
        </p>

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="mt-4 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-violet-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />

          {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>

        {logoutError && (
          <p role="alert" className="mt-2 text-xs text-red-200">
            {logoutError}
          </p>
        )}
      </div>
    </aside>
  );
}
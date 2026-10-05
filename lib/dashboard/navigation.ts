import {
  BookOpenText,
  FileText,
  LayoutDashboard,
  PanelsTopLeft,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavigationItem = {
  key: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  children?: DashboardNavigationItem[];
};

export const adminNavigation: DashboardNavigationItem[] = [
  {
    key: "overview",
    label: "Tổng quan",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    key: "pages",
    label: "Các trang",
    icon: PanelsTopLeft,
    children: [
      {
        key: "pages-list",
        label: "Danh sách trang",
        href: "/admin/pages",
      },
      {
        key: "pages-create",
        label: "Thêm trang",
        href: "/admin/pages/create",
      },
    ],
  },
  {
    key: "materials",
    label: "Tài liệu",
    icon: FileText,
    children: [
      {
        key: "materials-list",
        label: "Danh sách tài liệu",
        href: "/admin/materials",
      },
      {
        key: "materials-create",
        label: "Thêm tài liệu",
        href: "/admin/materials/create",
      },
    ],
  },
  {
    key: "activities",
    label: "Hoạt động",
    icon: BookOpenText,
    children: [
      {
        key: "activities-list",
        label: "Danh sách bài viết",
        href: "/admin/activities",
      },
      {
        key: "activities-create",
        label: "Thêm bài viết",
        href: "/admin/activities/create",
      },
    ],
  },
];
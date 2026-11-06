import {
    BookOpenText,
    FileText,
    LayoutDashboard,
    PanelsTopLeft,
    User,
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
        key: "users",
        label: "Người truy cập",
        icon: User,
        href: "/admin/users",
    },

    {
        key: "pages",
        label: " Quản trị Website",
        icon: PanelsTopLeft,
        children: [

            {
                key: "home-page",
                label: "Trang chủ",
                href: "/admin/pages/home",
            },
            {
                key: "library-page",
                label: "Tài liệu",
                href: "/admin/pages/materials",
            },
            {
                key: "flashcard-page",
                label: "Flashcard",
                href: "/admin/pages/flashcard",
            },
            {
                key: "activity-page",
                label: "Hoạt động",
                href: "/admin/activities",
            },
        ],
    },
    // {
    //     key: "materials",
    //     label: "Tài liệu",
    //     icon: FileText,
    //     children: [
    //         {
    //             key: "materials-list",
    //             label: "Danh sách tài liệu",
    //             href: "/admin/materials",
    //         },
    //         {
    //             key: "materials-create",
    //             label: "Thêm tài liệu",
    //             href: "/admin/materials/create",
    //         },
    //     ],
    // },
    // {
    //     key: "activities",
    //     label: "Hoạt động",
    //     icon: BookOpenText,
    //     children: [
    //         {
    //             key: "activities-list",
    //             label: "Danh sách bài viết",
    //             href: "/admin/activities",
    //         },
    //         {
    //             key: "activities-create",
    //             label: "Thêm bài viết",
    //             href: "/admin/activities/create",
    //         },
    //     ],
    // },
];
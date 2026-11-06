"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { LayoutDashboard, Image as ImageIcon, FileText, Layers } from "lucide-react";

import BannerTab from "./banner";
import Intro from "./intro";
import Document from "./document";

const sections = [
    { value: "banner", label: "Banner", icon: LayoutDashboard },
    { value: "intro", label: "Dải ảnh", icon: ImageIcon },
    { value: "document", label: "Tài liệu", icon: FileText },
    { value: "flashcard", label: "Flashcard", icon: Layers },
];

export default function HomeTabs() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const activeTab =
        sections.some((section) => section.value === searchParams.get("tab"))
            ? (searchParams.get("tab") ?? "banner")
            : "banner";

    function handleTabChange(value: string) {
        const nextTab = sections.some((section) => section.value === value)
            ? value
            : "banner";

        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", nextTab);

        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full space-y-6"
        >
            <div className="overflow-x-auto border-b border-slate-200">
                <TabsList
                    aria-label="Các phần nội dung trang chủ"
                    className="h-auto w-full min-w-max justify-start gap-8 rounded-none bg-transparent p-0"
                >
                    {sections.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeTab === section.value;
                        return (
                            <TabsTrigger
                                key={section.value}
                                value={section.value}
                                className={` sticky top-0 z-20 relative flex items-center gap-2 px-1 py-3 text-sm font-medium transition-all rounded-none bg-transparent shadow-none hover:text-[#5143EF] data-[state=active]:bg-transparent data-[state=active]:shadow-none ${isActive
                                    ? "text-[#5143EF] font-semibold"
                                    : "text-slate-500"
                                    }`}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? "text-[#5143EF]" : "text-slate-400"}`} />
                                {section.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5143EF]" />
                                )}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
            </div>

            <div className="w-full">
                <TabsContent
                    value="banner"
                    forceMount
                    className="mt-0 data-[state=inactive]:hidden"
                >
                    <BannerTab />
                </TabsContent>
                <TabsContent
                    value="intro"
                    forceMount
                    className="mt-0 data-[state=inactive]:hidden"
                >
                    <Intro />
                </TabsContent>
                <TabsContent
                    value="document"
                    forceMount
                    className="mt-0 data-[state=inactive]:hidden"
                >
                    <Document />
                </TabsContent>

                <TabsContent value="flashcard" className="mt-0 data-[state=inactive]:hidden">
                    <PendingSection title="Quản lý khu vực Flashcard" />
                </TabsContent>
            </div>
        </Tabs>
    );
}

function PendingSection({ title }: { title: string }) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">
                {title}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
                Phần chỉnh sửa này sẽ được kết nối ở bước tiếp theo.
            </p>
        </section>
    );
}
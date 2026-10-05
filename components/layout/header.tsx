"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import HeaderAuth from "@/components/auth/header-auth";

const navigation = [
    { label: "Trang chủ", href: "/" },
    { label: "Giới thiệu", href: "/about" },
    { label: "Tài liệu", href: "/materials" },
    { label: "Flashcard", href: "/flashcards" },
    { label: "Hoạt động", href: "/activities" },
];

type HeaderProps = {
    logoSrc?: string;
};

export default function Header({ logoSrc }: HeaderProps) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    function isActive(href: string) {
        return href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
    }

    function closeMenu() {
        setMenuOpen(false);
    }

    return (
        <header className="sticky top-0 z-50 border-b border-violet-50 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex min-h-19 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
                {/* Logo và tên website */}
                <Link
                    href="/"
                    onClick={closeMenu}
                    className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-violet-500 sm:gap-3"
                >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#F5F2FF]">
                        {logoSrc && (
                            <Image
                                src={logoSrc}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-contain"
                            />
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                            Alice In Teachingland
                        </p>

                        <p className="mt-0.5 hidden text-xs text-slate-600 sm:block">
                            Language Learning &amp; Teaching Studio
                        </p>
                    </div>
                </Link>

                {/* Menu desktop */}
                <nav
                    aria-label="Điều hướng chính"
                    className="hidden items-center gap-5 xl:flex"
                >
                    {navigation.map((item) => {
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={`whitespace-nowrap rounded-lg px-1 py-2 text-base transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${active
                                        ? "font-semibold text-[#5143EF]"
                                        : "text-slate-600 hover:text-[#5143EF]"
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Tài khoản và nút mở menu mobile */}
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <HeaderAuth />

                    <button
                        type="button"
                        aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-navigation"
                        onClick={() => setMenuOpen((previous) => !previous)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 xl:hidden"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            className="h-6 w-6"
                            aria-hidden="true"
                        >
                            {menuOpen ? (
                                <path d="m6 6 12 12M6 18 18 6" />
                            ) : (
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Menu mobile */}
            <nav
                id="mobile-navigation"
                aria-label="Điều hướng điện thoại"
                hidden={!menuOpen}
                className="border-t border-violet-100 px-4 pb-5 pt-3 xl:hidden"
            >
                <div className="mx-auto flex max-w-7xl flex-col gap-1">
                    {navigation.map((item) => {
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMenu}
                                aria-current={active ? "page" : undefined}
                                className={`rounded-xl px-4 py-3 text-sm ${active
                                        ? "bg-violet-50 font-semibold text-[#5143EF]"
                                        : "text-slate-600 hover:bg-violet-50"
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </header>
    );
}
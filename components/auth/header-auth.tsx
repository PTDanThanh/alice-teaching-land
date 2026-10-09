"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import apiClient, {
    getApiErrorMessage,
    type ApiResponse,
} from "@/lib/http";

type AuthUser = {
    id: string;
    fullName: string;
    email: string;
    role: "admin" | "client";
};

export default function HeaderAuth() {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [error, setError] = useState("");
    const menuRef = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadUser() {
            setLoading(true);
            setError("");

            try {
                const response = await apiClient.get<ApiResponse<{ user: AuthUser }>>(
                    "/api/me",
                    { signal: controller.signal },
                );

                const payload = response.data as ApiResponse<{ user: AuthUser }> & {
                    user?: AuthUser;
                    data?: { user?: AuthUser };
                };

                const currentUser = payload.user ?? payload.data?.user;

                if (!currentUser) {
                    throw new Error(payload.message ?? "Không thể lấy thông tin tài khoản.");
                }

                setUser(currentUser);
            } catch (error: unknown) {
                if (controller.signal.aborted || axios.isCancel(error)) {
                    return;
                }

                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    setUser(null);
                    return;
                }

                setError(
                    getApiErrorMessage(
                        error,
                        "Không thể kiểm tra tài khoản. Hãy tải lại trang.",
                    ),
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadUser();

        return () => controller.abort();
    }, [pathname]);

    async function handleLogout() {
        if (loggingOut) return;

        setLoggingOut(true);
        setError("");

        try {
            await apiClient.post("/api/logout");

            setUser(null);

            if (menuRef.current) {
                menuRef.current.open = false;
            }

            router.replace("/home");
            router.refresh();
        } catch {
            setError("Đăng xuất thất bại. Vui lòng thử lại.");
        } finally {
            setLoggingOut(false);
        }
    }

    if (loading) {
        return (
            <div
                role="status"
                aria-label="Đang kiểm tra tài khoản"
                className="h-10 w-24 animate-pulse rounded-full bg-violet-100"
            />
        );
    }

    if (!user) {
        return (
            <div className="flex items-center gap-3">
                <Link
                    href="/login"
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-violet-50"
                >
                    Đăng nhập
                </Link>

                <Link
                    href="/register"
                    className="rounded-full bg-[#5143EF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4435DC]"
                >
                    Đăng ký
                </Link>
            </div>
        );
    }


    const initials = user.fullName
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();

    return (
        <details ref={menuRef} className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-1 focus-visible:outline-2 focus-visible:outline-violet-500 [&::-webkit-details-marker]:hidden">
                <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAE3FF] text-sm font-bold text-[#5143EF]"
                >
                    {initials || "U"}
                </span>

                <span className="hidden max-w-36 truncate text-sm font-semibold text-slate-900 sm:block">
                    {user.fullName}
                </span>

                <span className="sr-only">Mở menu tài khoản</span>
            </summary>

            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-violet-100 bg-white p-3 shadow-lg">
                <p className="truncate text-sm font-semibold text-slate-900">
                    {user.fullName}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                    {user.email}
                </p>

                {user.role === "admin" && (
                    <Link
                        href="/admin"
                        className="mt-3 block rounded-lg px-3 py-2 text-sm font-medium text-[#5143EF] hover:bg-violet-50"
                    >
                        Trang quản trị
                    </Link>
                )}

                <button
                    type="button"
                    disabled={loggingOut}
                    onClick={handleLogout}
                    className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                    {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </button>

                {error && (
                    <p role="alert" className="mt-2 text-xs text-red-600">
                        {error}
                    </p>
                )}
            </div>
        </details>
    );
}
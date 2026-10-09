"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Ban, CheckCircle2, Loader2, ShieldCheck, UserRound, Search, } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import { apiClient, getApiErrorMessage } from "@/lib/http";

type UserRecord = {
    id: string;
    fullName: string;
    email: string;
    role: "admin" | "client";
    isActive: boolean;
    loginCount: number;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    totalTimeOnSiteSeconds: number;
};

function formatTimeOnSite(totalSeconds: number = 0): string {
    const seconds = Number.isFinite(totalSeconds)
        ? Math.max(0, Math.floor(totalSeconds))
        : 0;

    function normallizeSearch(value: string): string {
        return value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[đĐ]/g, "d")
            .toLowerCase()
            .trim();
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours} giờ ${minutes} phút ${remainingSeconds} giây`;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const savingRef = useRef(false);



    useEffect(() => {
        let disposed = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let controller: AbortController | undefined;

        async function loadUsers(firstLoad = false) {
            controller = new AbortController();

            try {
                // Không tải nền khi đang cập nhật vai trò hoặc tab bị ẩn.
                if (
                    !firstLoad &&
                    (savingRef.current ||
                        document.visibilityState !== "visible")
                ) {
                    return;
                }

                const response = await apiClient.get<{
                    success: boolean;
                    data?: UserRecord[];
                    message?: string;
                }>('/api/admin/users', {
                    signal: controller.signal,
                });

                const payload = response.data;

                if (!payload.success || !Array.isArray(payload.data)) {
                    throw new Error(
                        payload.message ?? "Không thể tải danh sách người dùng.",
                    );
                }

                if (!disposed && !savingRef.current) {
                    setUsers(payload.data);
                    setError("");
                }
            } catch (error: unknown) {
                if (disposed || axios.isCancel(error)) return;

                setError(
                    getApiErrorMessage(
                        error,
                        "Không thể cập nhật danh sách người dùng.",
                    ),
                );
            } finally {
                if (!disposed) {
                    setLoading(false);

                    // Chỉ lên lịch sau khi request trước đã kết thúc.
                    timer = setTimeout(() => {
                        void loadUsers();
                    }, 5000);
                }
            }
        }

        void loadUsers(true);

        return () => {
            disposed = true;
            controller?.abort();

            if (timer) clearTimeout(timer);
        };
    }, []);

    async function updateUser(
        userId: string,
        role: "admin" | "client",
    ) {
        if (savingRef.current) return;

        savingRef.current = true;
        setSavingId(userId);
        setError("");

        try {
            const response = await apiClient.patch<{
                success: boolean;
                data?: UserRecord;
                message?: string;
            }>('/api/admin/users', {
                id: userId,
                role,
            });

            const payload = response.data;
            const updatedUser = payload.data;

            if (!payload.success || !updatedUser) {
                throw new Error(
                    payload.message ?? "Cập nhật người dùng thất bại.",
                );
            }

            setUsers((current) =>
                current.map((user) =>
                    user.id === userId ? updatedUser : user,
                ),
            );
        } catch (error: unknown) {
            setError(getApiErrorMessage(error, "Cập nhật thất bại."));
        } finally {
            savingRef.current = false;
            setSavingId(null);
        }
    }

    const stats = useMemo(() => {
        return {
            total: users.length,
            active: users.filter((user) => user.isActive).length,
            admins: users.filter((user) => user.role === "admin").length,
        };
    }, [users]);

    //filter bộ lọc
    const [search, setSearch] = useState("")



    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">Quản trị</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tài khoản người dùng</h1>
                </div>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                            <UserRound className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm text-slate-500">Tổng tài khoản</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm text-slate-500">Đang hoạt động</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <ShieldCheck className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm text-slate-500">Quản trị</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.admins}</p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-4 font-semibold">Tên</th>
                                <th className="px-5 py-4 font-semibold">Email</th>
                                <th className="px-5 py-4 font-semibold">Vai trò</th>
                                <th className="px-5 py-4 font-semibold">Trạng thái</th>
                                <th className="px-5 py-4 font-semibold">Ngày tạo</th>
                                <th className="px-5 py-4 font-semibold text-right">Số lần đăng nhập</th>
                                <th className="px-5 py-4 font-semibold text-right">Số giờ truy cập</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Đang tải dữ liệu...
                                        </span>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                                        Chưa có tài khoản nào trong hệ thống.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/80">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                                                    {user.fullName
                                                        .split(" ")
                                                        .filter(Boolean)
                                                        .slice(-2)
                                                        .map((part) => part[0])
                                                        .join("")
                                                        .toUpperCase() || "U"}
                                                </span>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{user.fullName}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-slate-600">{user.email}</td>

                                        <td className="px-5 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(event) => {
                                                    const nextRole = event.target.value as "admin" | "client";
                                                    void updateUser(user.id, nextRole);
                                                }}
                                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none ring-0 transition focus:border-violet-300"
                                                aria-label={`Vai trò của ${user.fullName}`}
                                                disabled={savingId === user.id}
                                            >
                                                <option value="client">Client</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold ${user.isActive
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-red-50 text-red-700"
                                                    }`}
                                            >
                                                {user.isActive ? "Hoạt động" : "Khóa"}

                                                {!user.isActive && (
                                                    <Ban aria-hidden="true" className="h-3.5 w-3.5" />
                                                )}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4 text-slate-500">
                                            {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                                        </td>

                                        <td className="px-5 py-4 text-center font-semibold text-violet-700">
                                            {(user.loginCount ?? 0).toLocaleString("vi-VN")}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-right text-slate-600">
                                            {formatTimeOnSite(user.totalTimeOnSiteSeconds)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

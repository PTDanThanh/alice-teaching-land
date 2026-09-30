"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import type { LoginInput } from "@/schema/auth.schema";

function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (error instanceof Error) {
        return error.message || fallback;
    }

    if (typeof error === "string") {
        return error || fallback;
    }

    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message || fallback;
    }

    return fallback;
}

export function useAuth() {
    const router = useRouter();

    const busyRef = useRef(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function login(data: LoginInput): Promise<boolean> {
        if (busyRef.current) return false;

        busyRef.current = true;
        setLoading(true);
        setError(null);

        try {
            await authService.login(data);

            router.replace("/admin");
            router.refresh();

            return true;
        } catch (error: unknown) {
            setError(
                getErrorMessage(error, "Đăng nhập thất bại"),
            );

            return false;
        } finally {
            busyRef.current = false;
            setLoading(false);
        }
    }

    async function logout(): Promise<boolean> {
        if (busyRef.current) return false;

        busyRef.current = true;
        setLoading(true);
        setError(null);

        try {
            await authService.logout();

            router.replace("/login");
            router.refresh();

            return true;
        } catch (error: unknown) {
            setError(
                getErrorMessage(error, "Đăng xuất thất bại"),
            );

            return false;
        } finally {
            busyRef.current = false;
            setLoading(false);
        }
    }

    return {
        login,
        logout,
        loading,
        error,
        clearError: () => setError(null),
    };
}
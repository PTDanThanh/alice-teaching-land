import type { LoginInput } from "@/schema/auth.schema";
import { apiClient, getApiErrorMessage } from "@/lib/http";

export type AuthApiResponse<T = unknown> = {
    success?: boolean;
    message?: string;
    data?: T;
    user?: {
        id: string;
        fullName: string;
        email: string;
        role: "admin" | "client";
    };
};

export const authService = {
    async login(data: LoginInput): Promise<AuthApiResponse> {
        try {
            const { data: payload } = await apiClient.post<AuthApiResponse>(
                "/api/login",
                data,
            );

            return payload;
        } catch (error) {
            throw new Error(
                getApiErrorMessage(error, "Đăng nhập thất bại"),
            );
        }
    },

    async logout(): Promise<AuthApiResponse> {
        try {
            const { data: payload } = await apiClient.post<AuthApiResponse>(
                "/api/logout",
            );

            return payload;
        } catch (error) {
            throw new Error(
                getApiErrorMessage(error, "Đăng xuất thất bại"),
            );
        }
    },
};

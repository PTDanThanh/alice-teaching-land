import type { LoginInput } from "@/schema/auth.schema";

export type AuthApiResponse<T = unknown> = {
    success?: boolean;
    message?: string;
    data?: T;
};

async function readJson<T = unknown>(response: Response): Promise<T> {
    return (await response.json().catch(() => ({}))) as T;
}

export const authService = {
    async login(data: LoginInput): Promise<AuthApiResponse<{ email?: string }>> {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const payload = await readJson<AuthApiResponse<{ email?: string }>>(response);

        if (!response.ok) {
            throw new Error(
                typeof payload.message === "string"
                    ? payload.message
                    : "Đăng nhập thất bại",
            );
        }

        return payload;
    },

    async logout(): Promise<AuthApiResponse> {
        const response = await fetch("/api/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const payload = await readJson<AuthApiResponse>(response);

        if (!response.ok) {
            throw new Error(
                typeof payload.message === "string"
                    ? payload.message
                    : "Đăng xuất thất bại",
            );
        }

        return payload;
    },
};

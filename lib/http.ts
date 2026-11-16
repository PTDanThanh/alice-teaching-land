
import axios, {
    AxiosError,
    type InternalAxiosRequestConfig,
} from "axios";

export type ApiResponse<T = unknown> = {
    success?: boolean;
    message?: string;
    data?: T;
    user?: T;
};

type RetryConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

export const apiClient = axios.create({
    baseURL: "/",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Dùng chung một Promise trong tab; Web Locks đồng bộ refresh giữa các tab.
let refreshPromise: Promise<void> | null = null;

async function refreshWithCurrentCookie(
    expectedExpiresAt?: number,
): Promise<void> {
    try {
        const response = await axios.get<{ accessExpiresAt: number }>(
            "/api/me",
            { withCredentials: true },
        );

        // Một tab khác đã refresh trong lúc tab này chờ lock.
        if (
            expectedExpiresAt === undefined ||
            response.data.accessExpiresAt > expectedExpiresAt
        ) {
            return;
        }
    } catch (error: unknown) {
        if (
            !axios.isAxiosError(error) ||
            error.response?.status !== 401
        ) {
            throw error;
        }
    }

    await axios.post(
        "/api/auth/refresh",
        {},
        { withCredentials: true },
    );
}

export function refreshAccessToken(
    expectedExpiresAt?: number,
): Promise<void> {
    if (!refreshPromise) {
        const refresh = async () => {
            if (
                typeof navigator !== "undefined" &&
                navigator.locks
            ) {
                await navigator.locks.request(
                    "alice-teaching-land:auth-refresh",
                    { mode: "exclusive" },
                    () => refreshWithCurrentCookie(expectedExpiresAt),
                );
                return;
            }

            await refreshWithCurrentCookie(expectedExpiresAt);
        };

        refreshPromise = refresh()
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        if (!axios.isAxiosError(error)) {
            return Promise.reject(error);
        }

        const originalRequest = error.config as
            | RetryConfig
            | undefined;

        const status = error.response?.status;
        const requestUrl = originalRequest?.url ?? "";

        // Không refresh cho các API xác thực.
        const isAuthEndpoint =
            requestUrl.startsWith("/api/auth/") ||
            requestUrl.startsWith("/api/login") ||
            requestUrl.startsWith("/api/logout") ||
            requestUrl.startsWith("/api/register");

        // Chỉ thử refresh một lần khi nhận 401.
        if (
            status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isAuthEndpoint
        ) {
            originalRequest._retry = true;

            try {
                await refreshAccessToken();

                // Thử lại request ban đầu với access cookie mới.
                return apiClient(originalRequest);
            } catch {
                // Giữ lỗi 401 ban đầu để component xử lý.
            }
        }

        // Giữ nguyên AxiosError và HTTP status.
        const message =
            typeof error.response?.data?.message === "string"
                ? error.response.data.message
                : error.message || "Yêu cầu không thành công.";

        return Promise.reject(
            new AxiosError(
                message,
                error.code,
                error.config,
                error.request,
                error.response,
            ),
        );
    },
);

export function getApiErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (axios.isAxiosError(error)) {
        const message =
            typeof error.response?.data?.message === "string"
                ? error.response.data.message
                : error.message;

        return message || fallback;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "string" && error.trim()) {
        return error;
    }

    return fallback;
}

export default apiClient;

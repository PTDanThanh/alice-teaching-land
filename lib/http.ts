import axios from "axios";

export type ApiResponse<T = unknown> = {
    success?: boolean;
    message?: string;
    data?: T;
    user?: T;
};

export const apiClient = axios.create({
    baseURL: "/",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message =
            typeof error?.response?.data?.message === "string"
                ? error.response.data.message
                : typeof error?.message === "string" && error.message.trim().length > 0
                    ? error.message
                    : "Yêu cầu không thành công.";

        return Promise.reject(new Error(message));
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

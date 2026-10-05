import { apiClient, getApiErrorMessage } from "@/lib/http";

export type RegisterResponse = {
    success?: boolean;
    message?: string;
    data?: {
        email?: string;
        fullName?: string;
    };
};

export async function register(
    fullName: string,
    email: string,
    password: string,
): Promise<RegisterResponse> {
    try {
        const { data } = await apiClient.post<RegisterResponse>(
            "/api/register",
            { fullName, email, password },
        );

        return data;
    } catch (error) {
        throw new Error(
            getApiErrorMessage(error, "Không thể đăng ký."),
        );
    }
}

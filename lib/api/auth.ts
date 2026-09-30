export type RegisterResponse = {
    success?: boolean;
    message?: string;
    data?: {
        email?: string;
        name?: string;
    };
};

export async function register(
    name: string,
    email: string,
    password: string,
): Promise<RegisterResponse> {
    const response = await fetch("/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
    });

    const data = (await response
        .json()
        .catch(() => ({}))) as RegisterResponse;

    if (!response.ok) {
        throw new Error(
            typeof data.message === "string"
                ? data.message
                : "Không thể đăng ký.",
        );
    }

    return data;
}

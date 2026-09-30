"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
    loginSchema,
    type LoginInput,
} from "@/schema/auth.schema";

type ValidationErrors = Partial<
    Record<keyof LoginInput, string>
>;

export default function LoginForm() {
    const { login, loading, error } = useAuth();

    const [formData, setFormData] = useState<LoginInput>({
        email: "",
        password: "",
    });

    const [validationErrors, setValidationErrors] =
        useState<ValidationErrors>({});

    function updateField(
        field: "email" | "password",
        value: string,
    ) {
        setFormData((previous: LoginInput) => ({
            ...previous,
            [field]: value,
        }));

        // Xóa lỗi của trường đang được chỉnh sửa.
        setValidationErrors((previous: ValidationErrors) => ({
            ...previous,
            [field]: undefined,
        }));
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (loading) return;

        setValidationErrors({});

        const parsed = loginSchema.safeParse(formData);

        if (!parsed.success) {
            const errors: ValidationErrors = {};

            for (const issue of parsed.error.issues) {
                const field = issue.path[0];

                // Giữ thông báo lỗi đầu tiên của mỗi trường.
                if (
                    (field === "email" || field === "password") &&
                    !errors[field]
                ) {
                    errors[field] = issue.message;
                }
            }

            setValidationErrors(errors);
            return;
        }

        // Hook cần tự bắt lỗi API và cập nhật state error.
        await login(parsed.data);
    }

    const inputClassName = (invalid: boolean) =>
        `w-full rounded-xl border px-4 py-3 outline-none
     transition focus:ring-2 ${invalid
            ? "border-red-500 focus:ring-red-200"
            : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
        }`;

    return (
        <section className="w-full max-w-md rounded-3xl border border-indigo-100 bg-white p-8 shadow-lg">
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    Đăng nhập quản trị
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                    Chào mừng bạn trở lại với L’Univers d’Alice.
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                noValidate
                aria-busy={loading}
                className="space-y-5"
            >
                <div>
                    <label
                        htmlFor="login-email"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Email
                    </label>

                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        required
                        maxLength={254}
                        value={formData.email}
                        onChange={(event) =>
                            updateField("email", event.target.value)
                        }
                        aria-invalid={Boolean(validationErrors.email)}
                        aria-describedby={
                            validationErrors.email
                                ? "login-email-error"
                                : undefined
                        }
                        className={inputClassName(
                            Boolean(validationErrors.email),
                        )}
                    />

                    {validationErrors.email && (
                        <p
                            id="login-email-error"
                            className="mt-1 text-xs text-red-600"
                        >
                            {validationErrors.email}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="login-password"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Mật khẩu
                    </label>

                    <input
                        id="login-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={(event) =>
                            updateField("password", event.target.value)
                        }
                        aria-invalid={Boolean(validationErrors.password)}
                        aria-describedby={
                            validationErrors.password
                                ? "login-password-error"
                                : undefined
                        }
                        className={inputClassName(
                            Boolean(validationErrors.password),
                        )}
                    />

                    {validationErrors.password && (
                        <p
                            id="login-password-error"
                            className="mt-1 text-xs text-red-600"
                        >
                            {validationErrors.password}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? "Đang xử lý..." : "Đăng nhập"}
                </button>
            </form>
        </section>
    );
}
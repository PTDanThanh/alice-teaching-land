"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
    loginSchema,
    type LoginInput,
} from "@/schema/auth.schema";
import Link from "next/link"
import { ChevronLeft } from "lucide-react";
import GoogleAuthButton from "@/components/auth/google-auth-button";

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
    function inputClassName(invalid: boolean) {
        return [
            "h-12 w-full rounded-full bg-[#F5F2FF] px-5",
            "text-sm text-slate-900 outline-none transition",
            "border focus:ring-2",
            invalid
                ? "border-red-400 focus:ring-red-100"
                : "border-transparent focus:border-violet-300 focus:ring-violet-100",
        ].join(" ");
    }

    return (
        <section className="w-full max-w-150 rounded-3xl bg-white px-6 py-8 sm:min-h-[45vh] sm:px-12">
            <div className="flex items-start justify-start">
                <Link
                    href="/home"
                    className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-[#5143EF]"
                >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    <span> Quay về trang chủ</span>
                </Link>

            </div>
            {/* Vùng logo: thay bằng logo thật khi có */}
            <div
                aria-hidden="true"
                className="mx-auto h-21.5 w-21.5 rounded-full bg-[#F5F2FF]"
            />

            <h1 className="mt-5 text-center whitespace-nowrap text-xl font-bold tracking-tight text-[#111827] sm:text-[36px]">
                Alice In Teachingland
            </h1>

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
                        placeholder="Nhập vào email của bạn"
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
                        className={`${inputClassName(
                            Boolean(validationErrors.email),
                        )} placeholder:text-slate-400 placeholder:font-normal`}
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
                        className="mb-2 pl-1 block text-sm font-medium text-gray-700"
                    >
                        Mật khẩu
                    </label>

                    <input
                        id="login-password"
                        name="password"
                        type="password"
                        placeholder="Nhập mật khẩu của bạn"
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
                        className={`${inputClassName(
                            Boolean(validationErrors.password),
                        )} placeholder:text-slate-400 placeholder:font-normal`}
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

                <div className="flex items-center justify-center text[16px] text-gray-500" >
                    <span> Đăng ký nếu bạn chưa có tài khoản?</span>
                    <Link
                        href="/register"
                        className="ml-2 cursor-pointer font-bold text-[#5143EF] hover: underline">
                        Đăng ký
                    </Link>
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 text-[16px] text-slate-500">
                    <span>Hoặc đăng nhập qua</span>
                    <GoogleAuthButton mode="register" redirectTo="/home" />
                </div>



                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl cursor-pointer bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? "Đang xử lý..." : "Đăng nhập"}
                </button>
            </form>
        </section>
    );
}
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type FormEvent,
} from "react";

import { register } from "@/lib/api/auth";
import GoogleAuthButton from "@/components/auth/google-auth-button";

type RegisterData = {
  fullName: string;
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof RegisterData, string>>;

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {hidden && <path d="m3 3 18 18" />}
    </svg>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const busyRef = useRef(false);

  const [formData, setFormData] = useState<RegisterData>({
    fullName: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  function updateField(
    field: keyof RegisterData,
    value: string,
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busyRef.current) return;

    setError("");

    const fullName = formData.fullName.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    const errors: FieldErrors = {};

    if (!fullName) {
      errors.fullName = "Vui lòng nhập họ và tên.";
    } else if (fullName.length > 100) {
      errors.fullName = "Họ tên tối đa 100 ký tự.";
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.email = "Địa chỉ email không hợp lệ.";
    }

    if (password.length < 8) {
      errors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    } else if (
      new TextEncoder().encode(password).length > 72
    ) {
      errors.password = "Mật khẩu không được vượt quá 72 byte.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    busyRef.current = true;
    setLoading(true);

    try {
      await register(fullName, email, password);

      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Đăng ký thất bại. Vui lòng thử lại.",
      );
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }

  const [hoveredAuth, setHoverAuth] = useState<"login" | "sign-up" | null>(null);

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
    <section className="w-full max-w-185 rounded-3xl bg-white px-6 py-8 sm:min-h-180 sm:px-12">
      {/* Vùng logo: thay bằng logo thật khi có */}
      <div
        aria-hidden="true"
        className="mx-auto h-21.5 w-21.5 rounded-full bg-[#F5F2FF]"
      />

      <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-[#111827] sm:text-[34px]">
        Alice In Teachingland
      </h1>

      {/* Tab điều hướng */}
      <nav
        aria-label="Tài khoản"
        className="mx-auto mt-2 flex justify-center h-8 w-full max-w-75 rounded-full "
      >
        <div className="relative grid grid-cols-2 rounded-full p-1 drop-shadow-[0_2px_2px_rgba(5,150,105,0.25)] "
          onMouseLeave={() => setHoverAuth("sign-up")}
        >
          <span
            aria-hidden="true"
            className={`absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${hoveredAuth === "sign-up"
              ? "translate-x-full"
              : "translate-x-0"
              }`}
          />
          <Link
            href="/login"
            onMouseEnter={() => setHoverAuth("login")}
            className={`relative z-10 flex items-center justify-center rounded-full px-4 mb-2 text-xs font-semibold transition-colors duration-300 sm:text-sm ${hoveredAuth === "login" ? "text-black" : "text-violet-900"
              }`}
          >
            Đăng Nhập
          </Link>

          <Link
            href="/register"
            onMouseEnter={() => setHoverAuth("sign-up")}
            className={`relative z-10 flex mb-2 items-center justify-center rounded-full px-4 text-xs font-semibold transition-colors duration-300 sm:text-sm ${hoveredAuth === "sign-up" ? "text-black" : "text-violet-900"
              }`}
          >
            Đăng Ký
          </Link>
        </div>
      </nav>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={loading}
        className="mx-auto mt-5 w-full max-w-120 space-y-4"
      >
        <div>
          <label
            htmlFor="register-fullname"
            className="mb-2 block pl-1 text-base font-semibold text-slate-900"
          >
            Họ và tên

          </label>

          <input
            id="register-fullname"
            name="fullName"
            type="text"
            placeholder="Nhập họ tên của bạn"
            autoComplete="name"
            required
            maxLength={100}
            value={formData.fullName}
            onChange={(event) =>
              updateField("fullName", event.target.value)
            }
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={
              fieldErrors.fullName
                ? "register-fullname-error"
                : undefined
            }
            className={`${inputClassName(
              Boolean(fieldErrors.fullName),
            )} placeholder:text-slate-400 placeholder:font-normal`}
          />

          {fieldErrors.fullName && (
            <p
              id="register-fullname-error"
              className="mt-1 pl-4 text-xs text-red-600 "
            >
              {fieldErrors.fullName}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="mb-2 block pl-1 text-base font-semibold text-slate-900"
          >
            Địa chỉ email
          </label>

          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="Nhập địa chỉ email"
            required
            maxLength={254}
            value={formData.email}
            onChange={(event) =>
              updateField("email", event.target.value)
            }
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email
                ? "register-email-error"
                : undefined
            }
            className={`${inputClassName(
              Boolean(fieldErrors.email),
            )} placeholder:text-slate-400 placeholder:font-normal`}
          />

          {fieldErrors.email && (
            <p
              id="register-email-error"
              className="mt-1 pl-4 text-xs text-red-600"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="mb-2 block pl-1 text-base font-semibold text-slate-900"
          >
            Mật khẩu
          </label>

          <div className="relative">
            <input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Tạo mật khẩu"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={(event) =>
                updateField("password", event.target.value)
              }
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? "register-password-error"
                  : undefined
              }
              className={`${inputClassName(
                Boolean(fieldErrors.password),
              )} placeholder:text-slate-400 placeholder:font-normal pr-14`}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((previous) => !previous)
              }
              aria-label={
                showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
              }
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-2 flex w-10 items-center justify-center rounded-full text-slate-800 focus-visible:outline-2 focus-visible:outline-violet-500"
            >
              <EyeIcon hidden={!showPassword} />
            </button>
          </div>

          {fieldErrors.password && (
            <p
              id="register-password-error"
              className="mt-1 pl-4 text-xs text-red-600"
            >
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Google chỉ hoạt động khi được truyền callback */}
        <div className="flex items-center justify-center gap-2 text-[16px] text-slate-500">
          <span>Hoặc đăng ký qua</span>
          <GoogleAuthButton mode="register" redirectTo="/home" />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mx-auto flex h-12 w-full max-w-[320px] items-center justify-center rounded-full bg-[#5143EF] text-base font-semibold text-white transition hover:bg-[#4334DB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang tạo tài khoản..." : "Đăng Ký"}
        </button>
      </form>
    </section>
  );
}
"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/http";

interface GoogleCredential {
    credential: string;
}

interface GoogleIdentity {
    initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredential) => void;
        auto_select: boolean;
    }) => void;

    renderButton: (
        container: HTMLElement,
        options: {
            type: "standard" | "icon";
            theme: "outline" | "filled_blue" | "filled_black";
            size: "small" | "medium" | "large";
            text: "signup_with" | "signin_with";
            shape: "pill" | "rectangular" | "circle" | "square";
            width?: number;
            locale: string;
        },
    ) => void;
}

type GoogleWindow = Window & {
    google?: {
        accounts: {
            id: GoogleIdentity;
        };
    };
};

interface GoogleAuthButtonProps {
    mode?: "login" | "register";
    redirectTo?: string;
}

export default function GoogleAuthButton({
    mode = "register",
    redirectTo = "/home",
}: GoogleAuthButtonProps) {
    const router = useRouter();

    const containerRef = useRef<HTMLDivElement>(null);
    const busyRef = useRef(false);

    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    const handleCredential = useCallback(
        async ({ credential }: GoogleCredential) => {
            if (busyRef.current) return;

            busyRef.current = true;
            setLoading(true);
            setError(null);

            try {
                await apiClient.post("/api/auth/google", { credential });

                const destination =
                    redirectTo.startsWith("/") &&
                        !redirectTo.startsWith("//") &&
                        !redirectTo.includes("\\")
                        ? redirectTo
                        : "/home";

                router.replace(destination);
                router.refresh();
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Không thể kết nối. Vui lòng thử lại.",
                );
            } finally {
                busyRef.current = false;
                setLoading(false);
            }
        },
        [redirectTo, router],
    );

    useEffect(() => {
        if (!ready || !clientId || !containerRef.current) return;

        const identity = (window as GoogleWindow).google?.accounts.id;

        if (!identity) {
            return;
        }

        const container = containerRef.current;

        identity.initialize({
            client_id: clientId,
            callback: (response) => {
                void handleCredential(response);
            },
            auto_select: false,
        });

        container.replaceChildren();

        identity.renderButton(container, {
            type: "icon",
            theme: "outline",
            size: "large",
            text: mode === "register" ? "signup_with" : "signin_with",
            shape: "circle",
            locale: "vi",
        });

        return () => {
            container.replaceChildren();
        };
    }, [ready, clientId, mode, handleCredential]);

    if (!clientId) {
        return (
            <p role="alert" className="text-center text-sm text-red-600">
                Chưa cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID.
            </p>
        );
    }

    return (
        <div className="space-y-3" aria-busy={loading}>
            <Script
                id="google-identity-services"
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onReady={() => setReady(true)}
                onError={() => {
                    setError(
                        "Không thể tải Google. Hãy kiểm tra kết nối mạng.",
                    );
                }}
            />

            <div
                ref={containerRef}
                inert={loading}
                className={`flex min-h-11 justify-center ${loading ? "pointer-events-none opacity-60" : ""
                    }`}
            />

            {loading && (
                <p role="status" className="text-center text-sm text-slate-500">
                    Đang xác thực Google...
                </p>
            )}

            {error && (
                <p role="alert" className="text-center text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
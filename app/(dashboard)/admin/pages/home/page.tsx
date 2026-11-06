import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import HomeTabs from "./home-tabs";

export default function AdminHomePage() {
    return (
        <div className="mx-auto w-full max-w-full space-y-6 pb-8">
            <header className="space-y-3">
                <Link
                    href="/admin/pages"
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-violet-700"
                >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    Quay về danh sách trang
                </Link>

            </header>
            <HomeTabs />
        </div>
    );
}
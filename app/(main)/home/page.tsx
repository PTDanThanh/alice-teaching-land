import type { Metadata } from "next";
import Home from "./home";

const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002"
).replace(/\/+$/, "");

const title =
    "Alice In Teachingland | Học ngoại ngữ cùng Thạc sĩ Alice";

const description =
    "Khám phá tiếng Pháp và tiếng Anh cùng Thạc sĩ Alice qua những bài học sinh động, tài liệu hữu ích và flashcard giúp ghi nhớ từ vựng.";

export const metadata: Metadata = {
    title,
    description,

    alternates: {
        canonical: `${siteUrl}/home`,
    },

    openGraph: {
        title,
        description,
        url: `${siteUrl}/home`,
        siteName: "Alice In Teachingland",
        locale: "vi_VN",
        type: "website",

        images: [
            {
                url: `${siteUrl}/images/og-alice.jpg`,
                width: 1200,
                height: 630,
                alt: "Alice In Teachingland – Học ngoại ngữ cùng Thạc sĩ Alice",
            },
        ],
    },

    twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`${siteUrl}/images/og-alice.jpg`],
    },
};

export default function HomePage() {
    return <Home />;
}
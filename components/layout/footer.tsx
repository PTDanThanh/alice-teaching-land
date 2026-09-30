import Image from "next/image";
import Link from "next/link";
import { Globe, Mail, Play } from "lucide-react";

const exploreLinks = [
    { label: "Trang chủ", href: "/" },
    { label: "Giới thiệu", href: "/about" },
    { label: "Tài liệu", href: "/materials" },
    { label: "Flashcard", href: "/flashcards" },
];

const supportLinks = [
    { label: "Liên hệ", href: "/contact" },
    { label: "Góp ý", href: "/feedback" },
];

type FooterProps = {
    logoSrc?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        youtube?: string;
    };
};

export default function Footer({
    logoSrc,
    socialLinks,
}: FooterProps) {
    const socials = [
        {
            label: "Facebook",
            href: socialLinks?.facebook,
            Icon: Globe,
        },
        {
            label: "Instagram",
            href: socialLinks?.instagram,
            Icon: Mail,
        },
        {
            label: "YouTube",
            href: socialLinks?.youtube,
            Icon: Play,
        },
    ];

    return (
        <footer className="bg-[#5143EF] text-white">
            <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
                {/* Thương hiệu */}
                <div>
                    <div className="relative h-20 w-20 overflow-hidden rounded-full bg-[#C7B2EF]">
                        {logoSrc && (
                            <Image
                                src={logoSrc}
                                alt=""
                                fill
                                sizes="80px"
                                className="object-contain p-2"
                            />
                        )}
                    </div>

                    <Link
                        href="/"
                        className="mt-4 inline-block text-xl font-bold tracking-tight"
                    >
                        Alice In Teachingland
                    </Link>

                    <p className="mt-2 text-sm text-violet-100">
                        Learn and Explore. Open Every Door.
                    </p>

                    <div className="mt-5 flex items-center gap-4">
                        {socials.map(({ label, href, Icon }) =>
                            href ? (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`${label} — mở trong tab mới`}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3023BB] transition hover:bg-[#25199B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                >
                                    <Icon size={20} aria-hidden="true" />
                                </a>
                            ) : null,
                        )}
                    </div>
                </div>

                {/* Khám phá */}
                <div className="lg:pt-8">
                    <h2 className="text-xl font-bold">Khám Phá</h2>
                    <div
                        aria-hidden="true"
                        className="mb-4 mt-2 h-0.5 w-12 bg-white"
                    />

                    <nav
                        aria-label="Khám phá"
                        className="flex flex-col items-start gap-2.5"
                    >
                        {exploreLinks.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="text-sm text-violet-100 transition hover:text-white hover:underline"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Hỗ trợ */}
                <div className="lg:pt-8">
                    <h2 className="text-xl font-bold">Hỗ Trợ</h2>
                    <div
                        aria-hidden="true"
                        className="mb-4 mt-2 h-0.5 w-8 bg-white"
                    />

                    <nav
                        aria-label="Hỗ trợ"
                        className="flex flex-col items-start gap-2.5"
                    >
                        {supportLinks.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="text-sm text-violet-100 transition hover:text-white hover:underline"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
        </footer>
    );
}
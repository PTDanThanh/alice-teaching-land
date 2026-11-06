import type { HeroContent } from "@/schema/home-content.schema";

export const defaultHeroContent: HeroContent = {
    enabled: true,
    greeting: "🇫🇷 Bonjour l’ami!",
    tagline: "Học tiếng Pháp thật dễ dàng",
    title: "Học Cùng Thạc Sĩ Alice",
    description:
        "Cùng Alice khám phá tiếng Pháp, tiếng Anh qua những bài học sinh động, kiến thức bổ ích và hành trình học tập đầy cảm hứng.",
    imageUrl: "/images/hero-alice.png",
    imageAlt: "Không gian học ngoại ngữ cùng Thạc sĩ Alice",
    buttonLabel: "Let’s go",
    buttonHref: "/materials",
};
import type { IntroContent } from "@/schema/intro-content.schema";

export const defaultIntroContent: IntroContent = {
    enabled: true,

    images: Array.from({ length: 10 }, (_, index) => ({
        id: `logo-${index + 1}`,
        imageUrl: `/partners/logo-${index + 1}.jpg`,
        imageAlt: `Ảnh ${index + 1}`,
    })),
};
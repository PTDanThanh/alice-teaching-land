import type { ModeKey } from "@/lib/flashcards/validation";
export type FlashcardRow = {
 _id: string; slug: string; title: string; description: string; language: "en" | "fr"; level: string;
 quizletUrl: string; status: "draft" | "published"; sortOrder: number;
 modes: Record<ModeKey, {enabled:boolean;embedUrl:string}>;
};

import type { Metadata } from "next";

import FlashcardWorkspace from "./flashcard-workspace";

export const metadata: Metadata = {
  title: "Flashcard | Alice In Teachingland",
  description:
    "Luyện tập và ghi nhớ từ vựng tiếng Anh, tiếng Pháp cùng Alice.",
};

export default function FlashcardPage() {
  return <FlashcardWorkspace />;
}
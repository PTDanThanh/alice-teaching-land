import FlashcardStudy from "@/components/flashcards/flashcard-study";

// Next.js App Router: params là Promise ở Next.js 15+.
export default async function FlashcardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FlashcardStudy id={id} />;
}

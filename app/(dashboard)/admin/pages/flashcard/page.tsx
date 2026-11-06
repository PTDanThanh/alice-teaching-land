import { requireAdmin } from "@/lib/auth/admin";
import FlashcardAdmin from "@/components/admin/flashcard-admin";
export default async function AdminFlashcardPage(){await requireAdmin();return <FlashcardAdmin/>;}

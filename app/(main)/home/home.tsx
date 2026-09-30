import Hero from "./hero";
import Intro from "./intro";
import Document from "./document";
import Flashcards from "./flashcard";

export default function HomePage() {
    return (
        <main>
            <Hero />
            <Intro />
            <Document />
            <Flashcards />
        </main>
    );
}
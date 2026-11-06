import Hero from "./hero";
import Intro from "./intro";
import Document from "./document";
import Flashcards from "./flashcard";

import { getHomeContent } from "@/src/services/content/page-content.service";

export default async function Home() {
    const content = await getHomeContent();
    

    return (
        <>
            <Hero content={content.sections.hero} />
            <Intro content={content.sections.intro} />
            <Document />
            <Flashcards />
        </>
    );
}
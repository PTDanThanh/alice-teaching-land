export interface QuizletSet {
    id: string;
    title: string;
    description: string;
    language: "fr" | "en";
    level: string;
    embedUrl: string;
    quizletUrl: string;
}

export const quizletSets: QuizletSet[] = [
    {
        id: "toeic-lesson-20",
        title: "Thạc sĩ Alice — TOEIC Lesson 20",
        description: "Luyện tập từ vựng TOEIC: Word Families.",
        language: "en",
        level: "TOEIC",

        embedUrl:
            "https://quizlet.com/1061839143/flashcards/embed",
        quizletUrl:
            "https://quizlet.com/vn/1061839143/thac-si-alice-tu-vung-toeic-lesson-20-word-families-flash-cards/",
    },
];
import type { DictationSegment } from "./dictation";

export type SkillLanguage = "en" | "fr";
export type SkillContentStatus = "draft" | "published";

export type ListeningLessonInput = {
  title: string;
  language: SkillLanguage;
  youtubeUrl: string;
  videoId: string;
  transcript: string;
  segments: DictationSegment[];
  status: SkillContentStatus;
};

export type ListeningLessonRecord = ListeningLessonInput & {
  _id: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

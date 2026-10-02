import type { Metadata } from "next";

import MaterialLibrary from "./material-library";
import type { MaterialTypeFilter } from "@/data/materials";

export const metadata: Metadata = {
  title: "Thư viện tài liệu | Alice In Teachingland",
  description:
    "Khám phá tài liệu học tiếng Anh và tiếng Pháp dưới định dạng Word, PDF và PowerPoint.",
};

interface MaterialPageProps {
  searchParams: Promise<{
    language?: string | string[];
    type?: string | string[];
  }>;
}

export default async function MaterialPage({
  searchParams,
}: MaterialPageProps) {
  const params = await searchParams;

  const language = params.language === "fr" ? "fr" : "en";

  let type: MaterialTypeFilter = "all";

  if (
    params.type === "word" ||
    params.type === "pdf" ||
    params.type === "powerpoint"
  ) {
    type = params.type;
  }

  return (
    <MaterialLibrary
      key={`${language}-${type}`}
      initialLanguage={language}
      initialType={type}
    />
  );
}
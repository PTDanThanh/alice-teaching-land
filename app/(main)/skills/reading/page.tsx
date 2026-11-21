import type { Metadata } from "next";
import SkillPlaceholder from "@/components/skills/skill-placeholder";

export const metadata: Metadata = { title: "Reading | Alice In Teachingland" };
export default function Page() { return <SkillPlaceholder skill="reading" />; }

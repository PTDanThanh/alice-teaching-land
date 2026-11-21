import type { Metadata } from "next";
import SkillPlaceholder from "@/components/skills/skill-placeholder";

export const metadata: Metadata = { title: "Speaking | Alice In Teachingland" };
export default function Page() { return <SkillPlaceholder skill="speaking" />; }

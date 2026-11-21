
"use client";

import { useState } from "react";
import {
  BookOpenText,
  Headphones,
  Mic2,
  PenLine,
  ArrowUpRight,
} from "lucide-react";

import ListeningDictation from "./listening-dictation";

export type SkillKey =
  | "listening"
  | "speaking"
  | "reading"
  | "writing";

const skills = [
  {
    key: "listening",
    title: "Listening",
    description: "Luyện nghe và chép chính tả qua video YouTube.",
    icon: Headphones,
    color: "text-violet-600",
    active: "border-violet-300 bg-violet-50",
    available: true,
  },
  {
    key: "speaking",
    title: "Speaking",
    description: "Phát triển khả năng giao tiếp và phát âm.",
    icon: Mic2,
    color: "text-rose-600",
    active: "border-rose-300 bg-rose-50",
    available: false,
  },
  {
    key: "reading",
    title: "Reading",
    description: "Nâng cao kỹ năng đọc hiểu.",
    icon: BookOpenText,
    color: "text-sky-600",
    active: "border-sky-300 bg-sky-50",
    available: false,
  },
  {
    key: "writing",
    title: "Writing",
    description: "Rèn luyện kỹ năng viết.",
    icon: PenLine,
    color: "text-amber-600",
    active: "border-amber-300 bg-amber-50",
    available: false,
  },
] as const;

export function SkillTabs() {
  const [activeTab, setActiveTab] =
    useState<SkillKey>("listening");

  const currentSkill = skills.find(
    (skill) => skill.key === activeTab
  )!;

  return (
    <div className="space-y-8">

      {/* Navigation tabs */}
      <div
        role="tablist"
        aria-label="Language skills"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {skills.map((skill) => {
          const Icon = skill.icon;
          const isActive = activeTab === skill.key;

          return (
            <button
              key={skill.key}
              id={`tab-${skill.key}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="skill-panel"
              onClick={() => setActiveTab(skill.key)}
              className={`
                group relative flex flex-col
                items-center justify-center
                gap-3 rounded-2xl border
                px-4 py-5 text-center
                transition-all duration-200
                focus-visible:outline-2
                focus-visible:outline-violet-500
                ${isActive
                  ? `${skill.active} shadow-sm`
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }
              `}
            >
              <Icon
                className={`h-7 w-7 ${skill.color}`}
                aria-hidden="true"
              />

              <span
                className={`text-sm font-semibold sm:text-base ${isActive
                  ? "text-slate-950"
                  : "text-slate-600"
                  }`}
              >
                {skill.title}
              </span>

              {isActive && (
                <span
                  className="absolute bottom-0 h-1 w-12 rounded-t-full bg-violet-500"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active skill content */}
      <section
        id="skill-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="min-w-0  p-5 sm:p-6"
      >
        {activeTab === "listening" ? (
          <ListeningDictation />
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <currentSkill.icon
                className={`h-8 w-8 ${currentSkill.color}`}
              />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              {currentSkill.title} Practice
            </h2>

            <p className="max-w-md text-sm leading-6 text-slate-500">
              {currentSkill.description}
              {" "}
              Tính năng đang được phát triển và sẽ sớm ra mắt.
            </p>

            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
              Coming Soon
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

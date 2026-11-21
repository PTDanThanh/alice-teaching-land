
import { GraduationCap } from "lucide-react";
import { SkillTabs } from "./skill-tabs";

export default function SkillsHub() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8ff] via-white to-white">
      {/* Introduction */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid items-end gap-7 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="mt-4 ">
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Phát triển đủ{" "}
              <span className="text-violet-700">
                4 kỹ năng
              </span>{" "}
              ngoại ngữ
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Lắng nghe, diễn đạt, khám phá câu chuyện và viết
              nên suy nghĩ của bạn.
            </p>
          </div>


        </div>
      </section>

      {/* Skills tabs */}
      <section
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
        aria-labelledby="skills-heading"
      >


        <SkillTabs />
      </section>
    </div>
  );
}

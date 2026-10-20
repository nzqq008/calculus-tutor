import { ArrowRight, BookOpen, Lightbulb } from "lucide-react";
import type { Lesson } from "../api/types";
import { Formula, MathText } from "./MathText";

export function LessonCard({
  lesson,
  busy,
  onComplete,
}: {
  lesson: Lesson;
  busy: boolean;
  onComplete: () => void;
}) {
  return (
    <section className="card lesson-card" aria-label="关卡基础学习">
      <span className="eyebrow">
        <BookOpen size={16} /> 知识讲解
      </span>
      <h2>{lesson.title}</h2>
      <div className="lesson-objectives">
        <strong>这一关，你会学到</strong>
        <ul>
          {lesson.objectives.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {lesson.sections.map((section, index) => (
        <section className="lesson-section" key={section.heading}>
          <h3>
            <span className="lesson-section-index">{index + 1}</span>
            {section.heading}
          </h3>
          <MathText text={section.content} />
        </section>
      ))}
      {lesson.formulas.map((formula, index) => (
        <Formula key={index} value={formula} block />
      ))}
      <section className="worked-example" aria-label="分步例题">
        <span className="eyebrow">一起看一个例子</span>
        <MathText text={lesson.example.stem} />
        <ol>
          {lesson.example.steps.map((step, index) => (
            <li key={index}>
              <MathText text={step} />
            </li>
          ))}
        </ol>
      </section>
      <div className="lesson-checkpoint">
        <Lightbulb size={20} />
        <MathText text={lesson.checkpoint} />
      </div>
      <div className="lesson-actions">
        <button className="button primary" disabled={busy} onClick={onComplete}>
          {busy ? "正在开启挑战…" : "学完了，开始挑战"}
          <ArrowRight size={18} />
        </button>
        <p className="caption">
          接下来会分别检验这一关的关键技能。读过讲解不会直接算作通关。
        </p>
      </div>
    </section>
  );
}

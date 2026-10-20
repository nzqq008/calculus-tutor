import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { Answer, Question } from "../api/types";
import { purposeLabels } from "../lib/labels";
import { MathText, OptionText } from "./MathText";

export function QuestionCard({
  question,
  busy,
  locked,
  onSubmit,
}: {
  question: Question;
  busy: boolean;
  locked?: boolean;
  onSubmit: (answer: Answer) => void;
}) {
  const [answer, setAnswer] = useState<Answer>(
    question.type === "multi_select" ? [] : "",
  );
  const typeNames = {
    multiple_choice: "单选题",
    multi_select: "多选题",
    expression: "表达式输入",
    open_answer: "简答题",
  };
  const supported = Object.hasOwn(typeNames, question.type);
  const empty = Array.isArray(answer) ? answer.length === 0 : !answer.trim();
  const [context, task] = question.stem.includes("【本题任务】\n")
    ? question.stem.split("【本题任务】\n")
    : ["", question.stem];
  // Stable within one assignment, varied across assignments; visible letters are
  // presentation only. Submit the original option ID required by the API.
  const salt = [...question.assignment_id].reduce(
    (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
    0,
  );
  const options = [...(question.options || [])];
  if (options.length) options.push(...options.splice(0, salt % options.length));
  return (
    <form
      className="question-card"
      data-assignment={question.assignment_id}
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty && !busy && !locked) onSubmit(answer);
      }}
    >
      <div className="question-meta">
        <span className="tag">{question.stage_label || purposeLabels[question.purpose]}</span>
        <span className="muted">
          {typeNames[question.type] || "暂不支持的题型"}
        </span>
      </div>
      {context && (
        <MathText text={context.trim()} className="question-context" />
      )}
      <h2 className="question-title">
        <MathText text={task} />
      </h2>
      <fieldset disabled={busy || locked} className="answer-options">
        <legend className="sr-only">你的答案</legend>
        {(question.type === "multiple_choice" ||
          question.type === "multi_select") &&
          options.map((option, index) => {
            const checked = Array.isArray(answer)
              ? answer.includes(option.id)
              : answer === option.id;
            return (
              <label
                key={option.id}
                className={`answer-option ${checked ? "chosen" : ""}`}
              >
                <input
                  type={question.type === "multi_select" ? "checkbox" : "radio"}
                  name="answer"
                  value={option.id}
                  checked={checked}
                  onChange={() =>
                    setAnswer((old) =>
                      Array.isArray(old)
                        ? old.includes(option.id)
                          ? old.filter((v) => v !== option.id)
                          : [...old, option.id]
                        : option.id,
                    )
                  }
                />
                <span className="option-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="option-content">
                  <OptionText text={option.text} />
                </span>
              </label>
            );
          })}
        {question.type === "expression" && (
          <>
            <label className="field-label" htmlFor="expression-answer">
              输入数学表达式
            </label>
            <input
              id="expression-answer"
              className="text-input math-input"
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={256}
              autoComplete="off"
              placeholder="例如 2*x*cos(x^2)"
            />
            <p className="caption">
              支持 x、sin、cos、exp、log、sqrt；乘法用 *，幂用 ^ 或 **。
            </p>
          </>
        )}
        {question.type === "open_answer" && (
          <>
            <label className="field-label" htmlFor="open-answer">
              写下你的理解
            </label>
            <textarea
              id="open-answer"
              className="text-input"
              rows={5}
              maxLength={2000}
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="可以分步骤解释你的思路…"
            />
            <p className="caption">
              解释题由教学助手辅助评价，不会仅凭一次回答判定完整掌握。
            </p>
          </>
        )}
      </fieldset>
      {!supported && (
        <p role="alert">当前题型暂不支持，请联系维护者或重新同步进度。</p>
      )}
      <div className="question-footer">
        <span className="muted small-text">认真思考，比答得快更重要。</span>
        <button
          className="button primary"
          disabled={!supported || empty || busy || locked}
          type="submit"
        >
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <ArrowRight size={18} />
          )}{" "}
          {busy ? "正在提交…" : "提交答案"}
        </button>
      </div>
    </form>
  );
}

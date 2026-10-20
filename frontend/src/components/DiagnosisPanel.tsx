import type { LearningSummary } from "../api/types";
import { MathText, OptionText } from "./MathText";

export function DiagnosisPanel({ summary }: { summary: LearningSummary }) {
  const process = summary.diagnostic_process;
  const diagnosis = summary.diagnosis;
  return (
    <section className="learning-context" aria-label="当前诊断步骤">
      {process && (
        <>
          <span className="panel-kicker">当前任务</span>
          <h2>{process.stage}</h2>
          <p>{process.purpose}</p>
          <div className="task-next-step">
            <span>接下来</span>
            {process.next_step}
          </div>
        </>
      )}
      {!!diagnosis.descriptions.length && (
        <details className="diagnosis-explanation">
          <summary>
            为什么这样安排？<span>{diagnosis.descriptions.join("、")}</span>
          </summary>
          <p>这些是当前作答支持的错误线索，后续题目会继续验证。</p>
          {diagnosis.details?.map((detail) => (
            <section className="diagnosis-detail" key={detail.title}>
              <h3>{detail.title}</h3>
              <MathText text={detail.interpretation} />
              {!!detail.evidence.length && (
                <details>
                  <summary>查看本轮作答依据</summary>
                  {detail.evidence.map((evidence, i) => (
                    <div className="diagnosis-evidence" key={i}>
                      <MathText text={evidence.stem} />
                      <strong>你选择的结果</strong>
                      <OptionText text={evidence.answer} />
                    </div>
                  ))}
                </details>
              )}
              <details>
                <summary>为什么这样排查，还要区分什么</summary>
                <MathText text={detail.distinguish_from} />
                <ol>
                  {detail.diagnostic_steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </details>
              <p className="diagnosis-goal">
                <strong>本次补救目标：</strong>
                {detail.repair_goal}
              </p>
            </section>
          ))}
        </details>
      )}
    </section>
  );
}

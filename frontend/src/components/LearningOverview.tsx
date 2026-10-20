import { Check, Circle, Route, ChevronDown } from "lucide-react";
import type { LearningSummary } from "../api/types";

const statuses: Record<string, string> = {
  confirmed: "已确认",
  needs_work: "需补强",
  verifying: "待确认",
  untested: "未检验",
};
export function LearningOverview({ summary }: { summary: LearningSummary }) {
  return (
    <>
      <section className="study-route" aria-label="当前学习路线">
        <span className="panel-kicker">
          <Route size={15} /> 本次学习路线
        </span>
        <h2>{summary.target_name}</h2>
        <ol>
          {(summary.repair_path || [summary.active_name]).map(
            (name, i, path) => (
              <li
                key={`${i}-${name}`}
                className={i === path.length - 1 ? "active" : "waiting"}
              >
                <span className="route-dot" />
                <div>
                  <strong>{name}</strong>
                  <small>
                    {i === path.length - 1 ? "当前正在学习" : "补好基础后返回"}
                  </small>
                </div>
              </li>
            ),
          )}
        </ol>
        {!!summary.prerequisite_plan?.length && (
          <details className="prerequisite-details" open>
            <summary>
              相关基础检查 <ChevronDown size={14} />
            </summary>
            <ul>
              {summary.prerequisite_plan.map((item) => (
                <li key={`${item.parent}-${item.concept}`}>
                  <span>
                    {item.concept}
                    <small>{item.parent} 的前置</small>
                  </span>
                  <strong>
                    {item.status}
                    <small>
                      {item.checked || "0"} / {item.required || "2"} 道检查
                    </small>
                  </strong>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <section className="skill-overview" aria-label="关键技能进度">
        <div className="panel-heading">
          <h2>这一关的关键技能</h2>
          <span>
            {summary.confirmed_skill_count || 0} / {summary.skills?.length || 5}
          </span>
        </div>
        <p>首次测评覆盖每项技能；出错后用不同题再次确认。</p>
        <ul>
          {summary.skills?.map((skill) => (
            <li className={`skill-${skill.status}`} key={skill.id}>
              {skill.status === "confirmed" ? (
                <Check size={16} />
              ) : (
                <Circle size={13} />
              )}
              <span>{skill.label}</span>
              <small>{statuses[skill.status]}</small>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

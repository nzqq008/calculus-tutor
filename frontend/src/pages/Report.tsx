import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { useIdentity } from "../state/identity";
import { useGraph, useMastery, useSession, useSummary } from "../state/queries";
import { KnowledgeNetwork } from "../components/KnowledgeNetwork";
import { ErrorNotice, Loading } from "../components/Status";
import { MathText } from "../components/MathText";
import { masteryLabels, phaseLabels, purposeLabels } from "../lib/labels";

export function Report() {
  const navigate = useNavigate();
  const { sessionId = "" } = useParams();
  const {
    identity: { student },
  } = useIdentity();
  const session = useSession(sessionId),
    summary = useSummary(sessionId),
    graph = useGraph(),
    mastery = useMastery();
  if (!student)
    return (
      <section className="card empty-state">
        <h1>还没有学习记录</h1>
        <p>请先从知识网络开始一次学习。</p>
        <Link to="/" className="button primary">
          返回学习首页
        </Link>
      </section>
    );
  return (
    <>
      <Link className="back-link" to={`/learn/${sessionId}`}>
        <ArrowLeft size={16} />
        返回本次学习
      </Link>
      {summary.isPending && <Loading />}
      {summary.isError && (
        <ErrorNotice
          error={summary.error}
          retry={() => void summary.refetch()}
        />
      )}{" "}
      {session.isError && (
        <ErrorNotice
          error={session.error}
          retry={() => void session.refetch()}
        />
      )}
      {graph.isError && (
        <ErrorNotice error={graph.error} retry={() => void graph.refetch()} />
      )}
      {mastery.isError && (
        <ErrorNotice
          error={mastery.error}
          retry={() => void mastery.refetch()}
        />
      )}
      {summary.data && (
        <>
          <header className="report-header">
            <span className="eyebrow">YOUR LEARNING JOURNEY</span>
            <h1>每一步，都算数。</h1>
            <p>
              本次目标：{summary.data.target_name} ·{" "}
              {session.data ? phaseLabels[session.data.phase] : "正在同步"}
            </p>
            <p>{summary.data.message}</p>
            {summary.data.inference_message && (
              <p className="inference-message">
                {summary.data.inference_message}
              </p>
            )}
          </header>
          <div className="report-metrics">
            <div>
              <BookOpen />
              <strong>{summary.data.attempt_count}</strong>
              <span>实际答题记录</span>
            </div>
            <div>
              <MessageCircle />
              <strong>{summary.data.guidances.length}</strong>
              <span>接受的教学指导</span>
            </div>
            <div>
              <CheckCircle2 />
              <strong>
                {mastery.data?.concepts.filter((m) => m.status === "mastered")
                  .length ?? "—"}
              </strong>
              <span>通过直接测评的知识点</span>
            </div>
          </div>
          <div className="report-grid">
            <section>
              {graph.data && (
                <KnowledgeNetwork
                  graph={graph.data}
                  mastery={mastery.data?.concepts}
                  active={session.data?.active_concept}
                  onSelect={(id) =>
                    navigate(`/?concept=${encodeURIComponent(id)}`)
                  }
                />
              )}
              <div className="card mastery-report">
                <h2>知识掌握证据</h2>
                {mastery.data?.concepts.map((m) => (
                  <div className="mastery-row" key={m.concept_id}>
                    <strong>
                      {graph.data?.nodes.find((n) => n.id === m.concept_id)
                        ?.name || "知识点"}
                    </strong>
                    <span className={`mastery-badge ${m.status}`}>
                      {masteryLabels[m.status]}
                    </span>
                    <small>
                      {m.inferred_from
                        ? `由“${graph.data?.nodes.find((n) => n.id === m.inferred_from)?.name || "后续知识点"}”测评推断`
                        : m.evidence_ids.length
                          ? `${m.evidence_ids.length} 条测评证据`
                          : "尚无测评证据"}
                    </small>
                  </div>
                ))}
              </div>
            </section>
            <section className="card report-records">
              <h2>你的答题足迹</h2>
              {!summary.data.attempts.length && (
                <p className="muted">
                  还没有提交答案，继续学习后将在这里留下记录。
                </p>
              )}
              {summary.data.attempts.map((a, i) => (
                <article className="attempt-record" key={i}>
                  <div>
                    <span className={`result-dot ${a.grading_status}`} />
                    <strong>第 {i + 1} 次答题</strong>
                    <span className="tag">
                      {a.stage_label || purposeLabels[a.purpose]}
                    </span>
                  </div>
                  <p className="muted small-text">{a.concept_name}</p>
                  <MathText text={a.stem} />
                  <div className="answer-record">
                    你的回答：
                    <MathText
                      text={
                        Array.isArray(a.answer) ? a.answer.join("、") : a.answer
                      }
                    />
                  </div>
                  <span className={`result-text ${a.grading_status}`}>
                    {a.grading_status === "correct"
                      ? "该题回答正确"
                      : a.grading_status === "incorrect"
                        ? "该题尚未答对"
                        : "该题需要复核"}
                  </span>
                </article>
              ))}
            </section>
          </div>
          <section className="card report-teaching">
            <h2>这次重点学习了什么</h2>
            {summary.data.lessons?.map((lesson) => (
              <p key={lesson.concept_name}>
                <strong>{lesson.concept_name}</strong> · 已阅读基础讲解：
                {lesson.title}
              </p>
            ))}
            {!summary.data.guidances.length &&
              !summary.data.lessons?.length && (
                <p className="muted">本次尚无教学指导记录。</p>
              )}
            {summary.data.guidances.map((g, i) => (
              <details key={i}>
                <summary>
                  第 {i + 1} 次讲解 · {g.concept_name}
                </summary>
                <MathText text={g.content} />
              </details>
            ))}
          </section>
          <section className="next-step card">
            <div>
              <span className="eyebrow">WHAT’S NEXT</span>
              <h2>带着理解，继续向前。</h2>
              <p>
                {session.data?.recommendations.length
                  ? `后端推荐继续学习：${session.data.recommendations.map((id) => graph.data?.nodes.find((n) => n.id === id)?.name || "后续知识点").join("、")}`
                  : "回到知识网络，查看仍需学习的内容，或继续当前会话。"}
              </p>
            </div>
            <Link className="button primary" to="/">
              回到知识网络
              <ArrowRight size={18} />
            </Link>
          </section>
        </>
      )}
    </>
  );
}

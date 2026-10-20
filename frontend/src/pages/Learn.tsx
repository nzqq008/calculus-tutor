import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Route,
  RotateCw,
} from "lucide-react";
import { api, ApiError } from "../api/client";
import { useIdentity } from "../state/identity";
import { useGraph, useMastery, useSession, useSummary } from "../state/queries";
import { useAnswer } from "../state/useAnswer";
import { phaseLabels } from "../lib/labels";
import { KnowledgeNetwork } from "../components/KnowledgeNetwork";
import { LearningOverview } from "../components/LearningOverview";
import { DiagnosisPanel } from "../components/DiagnosisPanel";
import { QuestionCard } from "../components/QuestionCard";
import { Formula, MathText } from "../components/MathText";
import { TeachingArticle } from "../components/TeachingArticle";
import { ErrorNotice, Loading } from "../components/Status";
import { Practice } from "../components/Practice";
import { LessonCard } from "../components/LessonCard";

export function Learn() {
  const { sessionId = "" } = useParams();
  return <LearningSession key={sessionId} id={sessionId} />;
}
function LearningSession({ id }: { id: string }) {
  const {
    identity: { student },
  } = useIdentity();
  const navigate = useNavigate();
  const queries = useQueryClient();
  const session = useSession(id),
    summary = useSummary(id),
    graph = useGraph(),
    mastery = useMastery();
  const flow = useAnswer(id);
  const [mapOpen, setMapOpen] = useState(
    () => window.matchMedia("(min-width: 960px)").matches,
  );
  const state = session.data;
  const phase = state?.phase;
  const activeConcept = state?.active_concept;
  useEffect(() => {
    if (!phase) return;
    const main = document.querySelector<HTMLElement>(".learning-main");
    main?.scrollIntoView({ block: "start", behavior: "instant" });
    main?.focus({ preventScroll: true });
  }, [phase, activeConcept]);
  const lesson = useQuery({
    queryKey: [
      "student",
      student?.student_id,
      "lesson",
      id,
      state?.active_concept,
    ],
    queryFn: ({ signal }) => api.lesson(student!, id, signal),
    enabled:
      !!student &&
      state?.next_action === "show_lesson" &&
      state.status === "active",
    staleTime: Infinity,
  });
  const beginChallenge = useMutation({
    mutationFn: () => api.completeLesson(student!, id),
    onSuccess: async (result) => {
      await queries.cancelQueries({
        queryKey: ["student", student?.student_id, "session", id],
      });
      queries.setQueryData(
        ["student", student?.student_id, "session", id],
        result,
      );
      await Promise.all([
        queries.invalidateQueries({
          queryKey: ["student", student?.student_id, "summary", id],
        }),
        queries.invalidateQueries({
          queryKey: ["student", student?.student_id, "mastery"],
        }),
      ]);
    },
    onError: async () => {
      await Promise.all([
        session.refetch(),
        summary.refetch(),
        mastery.refetch(),
      ]);
    },
  });
  const question = useQuery({
    queryKey: [
      "student",
      student?.student_id,
      "question",
      id,
      state?.next_question_id,
      state?.active_concept,
      state?.revision,
      state?.phase,
      state?.round_count,
    ],
    queryFn: async ({ signal }) => {
      try {
        return await api.question(student!, id, signal);
      } catch (failure) {
        if (!(failure instanceof ApiError) || failure.status !== 409)
          throw failure;
        const latest = await api.session(student!, id, signal);
        queries.setQueryData(
          ["student", student?.student_id, "session", id],
          latest,
        );
        void queries.invalidateQueries({
          queryKey: ["student", student?.student_id, "summary", id],
        });
        if (
          latest.next_action === "answer_question" &&
          latest.status === "active"
        )
          return await api.question(student!, id, signal);
        throw failure;
      }
    },
    enabled:
      !!student &&
      state?.next_action === "answer_question" &&
      state.status === "active",
    staleTime: Infinity,
  });
  const guidance = useQuery({
    queryKey: [
      "student",
      student?.student_id,
      "guidance",
      id,
      state?.guidance_id,
      state?.round_count,
    ],
    queryFn: ({ signal }) => api.guidance(student!, id, signal),
    enabled: !!student && state?.next_action === "show_guidance",
    staleTime: Infinity,
  });
  const complete = useMutation({
    mutationFn: () => api.complete(student!, id),
    onSuccess: async (result) => {
      await queries.cancelQueries({
        queryKey: ["student", student?.student_id, "session", id],
      });
      queries.setQueryData(
        ["student", student?.student_id, "session", id],
        result,
      );
      await queries.invalidateQueries({
        queryKey: ["student", student?.student_id, "summary", id],
      });
    },
    onError: () => {
      void session.refetch();
    },
  });
  const resume = useMutation({
    mutationFn: () => api.resumeDiagnosis(student!, id),
    onSuccess: async (result) => {
      queries.setQueryData(
        ["student", student?.student_id, "session", id],
        result,
      );
      await queries.invalidateQueries({
        queryKey: ["student", student?.student_id, "summary", id],
      });
    },
    onError: () => {
      void session.refetch();
    },
  });
  if (!student)
    return (
      <section className="card empty-state">
        <h1>先建立你的学习身份</h1>
        <p>当前浏览器没有可用的匿名学习身份，请从首页开始。</p>
        <Link className="button primary" to="/">
          返回学习首页
        </Link>
      </section>
    );
  return (
    <>
      <div className="workspace-top">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} />
          学习首页
        </Link>
        <div>
          <Link className="text-link" to={`/report/${id}`}>
            查看本次学习报告
          </Link>
          <button
            className="icon-button"
            aria-label="同步学习进度"
            disabled={flow.busy}
            onClick={() => void flow.sync()}
          >
            <RotateCw size={17} />
          </button>
        </div>
      </div>
      {session.isError && (
        <ErrorNotice
          error={session.error}
          retry={() => void session.refetch()}
        />
      )}
      {summary.isError && (
        <ErrorNotice
          error={summary.error}
          retry={() => void summary.refetch()}
        />
      )}
      {session.isPending && <Loading />}
      {state && (
        <div className="workspace focused-workspace">
          <aside className="knowledge-sidebar">
            {summary.data && <LearningOverview summary={summary.data} />}
            <details
              className="knowledge-browser"
              open={mapOpen}
              onToggle={(e) => setMapOpen(e.currentTarget.open)}
            >
              <summary>
                知识地图<span>{mapOpen ? "收起" : "展开"}</span>
              </summary>
              {graph.data && (
                <KnowledgeNetwork
                  graph={graph.data}
                  mastery={mastery.data?.concepts}
                  active={state.active_concept}
                  selected={state.active_concept}
                  onSelect={(concept) =>
                    navigate(`/?concept=${encodeURIComponent(concept)}`)
                  }
                />
              )}
            </details>
            {graph.isError && (
              <ErrorNotice
                error={graph.error}
                retry={() => void graph.refetch()}
              />
            )}{" "}
            {mastery.isError && (
              <ErrorNotice
                error={mastery.error}
                retry={() => void mastery.refetch()}
              />
            )}
          </aside>
          <main
            className="learning-main"
            aria-label="当前学习区域"
            tabIndex={-1}
          >
            <ol className="level-progress" aria-label="关卡进度">
              <li className={state.phase === "learning" ? "current" : "done"}>
                <span>1</span>先学习
              </li>
              <li
                className={
                  state.phase === "completed"
                    ? "done"
                    : state.phase === "learning"
                      ? ""
                      : "current"
                }
              >
                <span>2</span>挑战与补救
              </li>
              <li className={state.phase === "completed" ? "current done" : ""}>
                <span>3</span>通关点亮
              </li>
            </ol>
            <div className="learning-title">
              <span className="panel-kicker">
                {state.learning_stack.length
                  ? "补强基础 · 保留原目标进度"
                  : "一步一步，建立自己的理解"}
              </span>
              <h1>{summary.data?.active_name || "当前知识点"}</h1>
              <div className="learning-subtitle">
                <span className="tag">{phaseLabels[state.phase]}</span>
                {state.learning_stack.length > 0 && (
                  <span>原目标：{summary.data?.target_name || "读取中"}</span>
                )}
                <span>
                  已查看 {summary.data?.viewed_explanations ?? "—"} 段讲解
                </span>
                <span>
                  已完成 {summary.data?.completed_checks ?? "—"} 道验证题
                </span>
              </div>
            </div>
            {summary.data?.remediation_reason && (
              <div className="notice remediation" role="status">
                <Route size={21} />
                <div>
                  <strong>先把基础接起来</strong>
                  <p>{summary.data.remediation_reason}</p>
                </div>
              </div>
            )}
            {summary.data && <DiagnosisPanel summary={summary.data} />}
            {state.next_action === "show_lesson" && (
              <>
                {lesson.isPending && (
                  <Loading text="正在准备这一关的基础讲解…" />
                )}
                {lesson.isError && (
                  <ErrorNotice
                    error={lesson.error}
                    retry={() => void lesson.refetch()}
                  />
                )}
                {beginChallenge.isError && (
                  <ErrorNotice error={beginChallenge.error} />
                )}
                {lesson.data && (
                  <LessonCard
                    lesson={lesson.data}
                    busy={beginChallenge.isPending || !!session.error}
                    onComplete={() => beginChallenge.mutate()}
                  />
                )}
              </>
            )}
            {flow.feedback && (
              <details
                className={`feedback answer-feedback ${flow.feedback.status}`}
              >
                <summary role="status">
                  <strong>
                    {flow.feedback.status === "correct"
                      ? "上次回答正确"
                      : flow.feedback.status === "incorrect"
                        ? "上次回答需要再想一想"
                        : "上次回答需要复核"}
                  </strong>
                  <span>查看上一题解析</span>
                </summary>
                <MathText text={flow.feedback.feedback} />
              </details>
            )}
            {flow.notice && (
              <div className="notice" role="status">
                {flow.notice}
              </div>
            )}
            {!!flow.error && <ErrorNotice error={flow.error} />}
            {flow.pending && !flow.busy && (
              <div className="notice pending">
                <div>
                  <strong>正在确认这次作答</strong>
                  <p>
                    答案已暂存，确认前不会重复推进。若网络持续异常，可重试原答案或同步进度。
                  </p>
                </div>
                <div className="button-row">
                  <button
                    className="button secondary small"
                    onClick={flow.retry}
                    disabled={flow.busy}
                  >
                    重试原提交
                  </button>
                  <button
                    className="button secondary small"
                    onClick={() => void flow.sync()}
                    disabled={flow.busy}
                  >
                    同步当前进度
                  </button>
                </div>
              </div>
            )}
            {state.next_action === "answer_question" && (
              <>
                {["initial_assessment", "mastery_check"].includes(
                  state.phase,
                ) &&
                  summary.data && (
                    <div className="assessment-progress">
                      <span>
                        {state.phase === "mastery_check"
                          ? "技能掌握进度"
                          : "本轮关卡挑战"}
                      </span>
                      <span>
                        {summary.data.assessment_answered} /{" "}
                        {summary.data.assessment_total}{" "}
                        {state.phase === "mastery_check" ? "已确认" : "已作答"}
                      </span>
                      <progress
                        value={summary.data.assessment_answered}
                        max={summary.data.assessment_total}
                      />
                    </div>
                  )}
                {state.phase === "verifying" && (
                  <div className="verification-progress" role="status">
                    <strong>
                      {state.verification_kind === "return_check"
                        ? "返回原目标验证"
                        : "补救效果验证"}
                    </strong>
                    <span>
                      第{" "}
                      {Math.max(
                        1,
                        (state.verification_total || 2) -
                          (state.verification_remaining || 1) +
                          1,
                      )}{" "}
                      / {state.verification_total || 2} 道 ·
                      两道不同题确认同一技能
                    </span>
                  </div>
                )}
                {question.isPending && <Loading text="正在准备下一道题…" />}
                {question.isError && (
                  <ErrorNotice
                    error={question.error}
                    retry={() => void question.refetch()}
                  />
                )}{" "}
                {question.data && (
                  <QuestionCard
                    key={question.data.assignment_id}
                    question={question.data}
                    busy={flow.busy}
                    locked={!!flow.pending || !!session.error}
                    onSubmit={(a) => flow.submit(question.data!, a)}
                  />
                )}
              </>
            )}
            {state.next_action === "show_guidance" && (
              <>
                {guidance.isPending && <Loading text="正在准备针对性讲解…" />}
                {guidance.isError && (
                  <ErrorNotice
                    error={guidance.error}
                    retry={() => void guidance.refetch()}
                  />
                )}{" "}
                {guidance.data && (
                  <section className="guidance-card card">
                    <span className="panel-kicker">针对性指导</span>
                    <h2>把这一步想清楚</h2>
                    {summary.data?.learning_path && (
                      <div className="learning-path" aria-label="本轮学习路径">
                        <span className="eyebrow">从错误思路走向正确理解</span>
                        <strong>{summary.data.learning_path.current}</strong>
                        <ArrowRight size={20} aria-hidden="true" />
                        <span>{summary.data.learning_path.objective}</span>
                        <p className="caption">
                          {summary.data.learning_path.basis}
                        </p>
                      </div>
                    )}
                    <TeachingArticle text={guidance.data.content} />
                    {guidance.data.latex_formulas.map((f, i) => (
                      <Formula key={i} value={f} block />
                    ))}
                    <div className="guiding-question">
                      <strong>想一想</strong>
                      <MathText text={guidance.data.followup_prompt} />
                    </div>
                    {guidance.data.fallback && (
                      <p className="caption">
                        当前使用已保存的基础讲解，教学服务暂时没有生成新的表达。
                      </p>
                    )}
                    {complete.isError && <ErrorNotice error={complete.error} />}
                    <button
                      className="button primary"
                      disabled={complete.isPending || !!flow.pending}
                      onClick={() => complete.mutate()}
                    >
                      {complete.isPending
                        ? "正在准备验证题…"
                        : "我已阅读，开始复测"}
                      <ArrowRight size={18} />
                    </button>
                    <p className="caption">
                      阅读指导不会改变掌握状态，接下来用新题检验理解。
                    </p>
                  </section>
                )}
              </>
            )}
            {["completed", "paused", "needs_review"].includes(
              state.next_action,
            ) && (
              <section className="card completion-card">
                <CheckCircle2 size={40} />
                <h2>{phaseLabels[state.phase]}</h2>
                <p>{summary.data?.message}</p>
                {summary.data?.inference_message && (
                  <p className="inference-message">
                    {summary.data.inference_message}
                  </p>
                )}
                {state.status === "needs_review" && (
                  <>
                    <p className="caption">
                      可以按当前题目记录重新识别，继续有针对性的学习。
                    </p>
                    {resume.isError && <ErrorNotice error={resume.error} />}
                    <button
                      className="button primary"
                      disabled={resume.isPending}
                      onClick={() => resume.mutate()}
                    >
                      {resume.isPending
                        ? "正在重新识别…"
                        : "重新识别并继续学习"}
                    </button>
                  </>
                )}
                <Link className="button primary" to={`/report/${id}`}>
                  查看学习报告
                  <ArrowRight size={18} />
                </Link>
                <Link className="text-link" to="/">
                  返回知识网络，选择下一步
                </Link>
              </section>
            )}
            <div className="study-footer">
              <span>本次已提交 {summary.data?.attempt_count ?? "—"} 道题</span>
              <span>掌握结论由后端测评确认</span>
            </div>
            {state.status === "active" && state.phase !== "learning" && (
              <details className="practice-details">
                <summary>想再练一练？展开额外练习</summary>
                <Practice
                  key={state.active_concept}
                  id={id}
                  options={summary.data?.practice_questions || []}
                />
              </details>
            )}
          </main>
        </div>
      )}
    </>
  );
}

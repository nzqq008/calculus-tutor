import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LearningSummary } from "../api/types";
import { api } from "../api/client";
import { useIdentity } from "../state/identity";
import { useAnswer } from "../state/useAnswer";
import { ErrorNotice, Loading } from "./Status";
import { QuestionCard } from "./QuestionCard";

export function Practice({
  id,
  options,
}: {
  id: string;
  options: LearningSummary["practice_questions"];
}) {
  const queries = useQueryClient();
  const {
    identity: { student },
  } = useIdentity();
  const [choice, setChoice] = useState("");
  const [requested, setRequested] = useState(false);
  const flow = useAnswer(id, true);
  const question = useQuery({
    queryKey: ["student", student?.student_id, "practice", id, choice],
    queryFn: ({ signal }) =>
      api.practice(student!, id, choice || undefined, signal),
    enabled: requested && !!student && !flow.feedback,
    staleTime: Infinity,
  });
  return (
    <section className="practice-section">
      <div className="section-heading">
        <h3>额外练习</h3>
        <span className="caption">不改变当前测评与掌握结论</span>
      </div>
      {!requested ? (
        <>
          <label className="field-label" htmlFor="practice-type">
            选择练习
          </label>
          <select
            id="practice-type"
            className="text-input"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="">当前知识点的默认练习</option>
            {options.map((q) => (
              <option key={q.question_id} value={q.question_id}>
                {q.stem}
              </option>
            ))}
          </select>
          <button
            className="button secondary"
            onClick={() => setRequested(true)}
          >
            获取练习题
          </button>
        </>
      ) : (
        <>
          {question.isPending && <Loading />}
          {question.isError && (
            <ErrorNotice
              error={question.error}
              retry={() => void question.refetch()}
            />
          )}{" "}
          {flow.error && <ErrorNotice error={flow.error} />}{" "}
          {flow.pending && (
            <div className="notice">
              <p>有一份练习提交需要确认。</p>
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
                同步练习
              </button>
            </div>
          )}
          {flow.feedback && (
            <>
              <p className="feedback" role="status">
                {flow.feedback.feedback}
              </p>
              <button
                className="button secondary"
                disabled={flow.busy}
                onClick={() => {
                  setRequested(false);
                  flow.resetFeedback();
                  queries.removeQueries({
                    queryKey: ["student", student?.student_id, "practice", id],
                  });
                }}
              >
                选择下一道练习
              </button>
            </>
          )}
          {!flow.feedback && question.data && (
            <QuestionCard
              key={question.data.assignment_id}
              question={question.data}
              busy={flow.busy}
              locked={!!flow.pending}
              onSubmit={(a) => flow.submit(question.data!, a)}
            />
          )}
        </>
      )}
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import type { Answer, AnswerRequest, Grading, Question } from "../api/types";
import { readPending, writePending } from "../lib/storage";
import { useIdentity } from "./identity";

export function useAnswer(id: string, practice = false) {
  const {
    identity: { student },
  } = useIdentity();
  const queries = useQueryClient();
  const [pending, setPending] = useState(() => readPending(id, practice));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const [feedback, setFeedback] = useState<Grading | null>(null);
  const inFlight = useRef(false);
  const recovered = useRef(false);
  const savePending = useCallback(
    (value: AnswerRequest | null) => {
      setPending(value);
      writePending(id, value, practice);
    },
    [id, practice],
  );
  const refresh = useCallback(async () => {
    await queries.cancelQueries({ queryKey: ["student", student?.student_id] });
    const state = await api.session(student!, id);
    queries.setQueryData(
      ["student", student?.student_id, "session", id],
      state,
    );
    // Never reuse an assignment cached during an earlier visit to this question.
    queries.removeQueries({
      queryKey: [
        "student",
        student?.student_id,
        practice ? "practice" : "question",
        id,
      ],
    });
    await Promise.all([
      queries.invalidateQueries({
        queryKey: ["student", student?.student_id, "summary", id],
      }),
      queries.invalidateQueries({
        queryKey: ["student", student?.student_id, "mastery"],
      }),
    ]);
    return state;
  }, [id, practice, queries, student]);
  const send = useCallback(
    async (body: AnswerRequest) => {
      if (inFlight.current || !student) return;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      setFeedback(null);
      setNotice("");
      savePending(body);
      try {
        await queries.cancelQueries({
          queryKey: ["student", student.student_id],
        });
        const result = await (async () => {
          try {
            return await api.answer(student, id, body, practice);
          } catch (failure) {
            if (
              !(failure instanceof ApiError) ||
              (failure.status !== 0 && failure.status < 500)
            )
              throw failure;
            setNotice("正在确认这次作答，请稍候…");
            // Same request ID: a lost response cannot grade or advance twice.
            return await api.answer(student, id, body, practice);
          }
        })();
        setFeedback(result.grading);
        savePending(null);
        if (!practice)
          queries.setQueryData(
            ["student", student.student_id, "session", id],
            result,
          );
        try {
          await refresh();
          setNotice("");
        } catch {
          setNotice("答案已保存。学习进度暂未刷新，网络恢复后可同步继续。");
        }
      } catch (failure) {
        if (failure instanceof ApiError && failure.status === 409) {
          try {
            await refresh();
            savePending(null);
            setNotice("学习进度已自动同步，请按当前页面继续。");
          } catch (syncFailure) {
            setError(syncFailure);
          }
        } else {
          setError(failure);
          setNotice("");
        }
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [id, practice, queries, refresh, savePending, student],
  );
  useEffect(() => {
    const saved = readPending(id, practice);
    if (!student || !saved || recovered.current) return;
    recovered.current = true;
    void Promise.resolve().then(() => send(saved));
  }, [id, practice, send, student]);
  const sync = async () => {
    if (inFlight.current || !student) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await refresh();
      savePending(null);
      setFeedback(null);
      setNotice("已同步最新学习进度。");
    } catch (failure) {
      setError(failure);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return {
    resetFeedback: () => setFeedback(null),
    pending,
    busy,
    error,
    notice,
    feedback,
    sync,
    submit: (question: Question, answer: Answer) =>
      void send({
        request_id: crypto.randomUUID(),
        question_id: question.question_id,
        assignment_id: question.assignment_id,
        answer,
      }),
    retry: () => pending && void send(pending),
  };
}

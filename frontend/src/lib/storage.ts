import type { AnswerRequest, Student } from "../api/types";
import { apiConfig } from "../api/client";
export interface SessionRef {
  id: string;
  concept: string;
  name: string;
  createdAt: string;
}
export interface Identity {
  student: Student | null;
  sessions: SessionRef[];
  current: string | null;
}
export const identityKey = `calculus-tutor.v1:${apiConfig.base}`;
export const emptyIdentity = (): Identity => ({
  student: null,
  sessions: [],
  current: null,
});
export function loadIdentity(): Identity {
  try {
    const value = JSON.parse(
      localStorage.getItem(identityKey) || "null",
    ) as Identity | null;
    if (
      value?.student?.student_id &&
      value.student.access_token &&
      Array.isArray(value.sessions)
    )
      return value;
  } catch {
    /* Corrupt or blocked browser storage: start with a visible anonymous identity. */
  }
  return emptyIdentity();
}
export function saveIdentity(value: Identity) {
  try {
    localStorage.setItem(identityKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function pendingKey(id: string, practice = false) {
  return `${identityKey}:pending:${id}:${practice}`;
}
export function readPending(
  id: string,
  practice = false,
): AnswerRequest | null {
  try {
    return JSON.parse(
      sessionStorage.getItem(pendingKey(id, practice)) || "null",
    ) as AnswerRequest | null;
  } catch {
    return null;
  }
}
export function writePending(
  id: string,
  value: AnswerRequest | null,
  practice = false,
) {
  try {
    if (value)
      sessionStorage.setItem(pendingKey(id, practice), JSON.stringify(value));
    else sessionStorage.removeItem(pendingKey(id, practice));
  } catch {
    /* In-memory state still protects same-page retries. */
  }
}

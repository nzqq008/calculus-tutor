import { it, expect } from "vitest";
import {
  emptyIdentity,
  identityKey,
  loadIdentity,
  saveIdentity,
  readPending,
  writePending,
} from "./storage";
it("recovers actual anonymous identity and handles corrupt storage", () => {
  expect(loadIdentity()).toEqual(emptyIdentity());
  const value = {
    student: { student_id: "s", access_token: "t", token_type: "bearer" },
    sessions: [],
    current: null,
  };
  saveIdentity(value);
  expect(loadIdentity()).toEqual(value);
  localStorage.setItem(identityKey, "not-json");
  expect(loadIdentity()).toEqual(emptyIdentity());
});
it("keeps unresolved request IDs and bodies across refresh and separates practice", () => {
  const body = {
    request_id: "same",
    assignment_id: "a",
    question_id: "q",
    answer: "A",
  };
  writePending("s", body);
  expect(readPending("s")).toEqual(body);
  expect(readPending("s", true)).toBeNull();
  writePending("s", null);
  expect(readPending("s")).toBeNull();
});

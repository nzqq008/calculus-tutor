import { describe, it, expect, vi } from "vitest";
import { ApiClient, ApiError, normalizeBase } from "./client";
describe("API contract and failures", () => {
  it("normalizes only configured API roots and rejects secrets or wrong prefixes", () => {
    expect(normalizeBase("https://api.example.com/api/v1/")).toBe(
      "https://api.example.com/api/v1",
    );
    for (const bad of [
      "",
      "https://api.example.com",
      "https://user:secret@api.example.com/api/v1",
      "javascript:alert(1)",
      "https://api.example.com/api/v1?token=x",
    ])
      expect(() => normalizeBase(bad)).toThrow();
  });
  it("sends Bearer and exact idempotent payload without putting a token in the URL", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async () => new Response(JSON.stringify({ phase: "diagnosing" })),
      );
    const client = new ApiClient("https://api.example.com/api/v1", fetcher);
    const student = {
      student_id: "student",
      access_token: "sensitive-token",
      token_type: "bearer",
    };
    const body = {
      request_id: "retry-same-id",
      question_id: "question",
      assignment_id: "assignment",
      answer: "A",
    };
    await client.answer(student, "session", body);
    await client.answer(student, "session", body);
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://api.example.com/api/v1/sessions/session/answers",
    );
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer sensitive-token",
    });
    expect(fetcher.mock.calls[0][1]?.body).toBe(fetcher.mock.calls[1][1]?.body);
  });
  it.each([403, 404, 409, 422, 429, 500])(
    "sanitizes HTTP %s and preserves its status",
    async (status) => {
      const client = new ApiClient(
        "https://api.example.com/api/v1",
        vi
          .fn()
          .mockResolvedValue(
            new Response("internal-key-or-prompt", { status }),
          ),
      );
      try {
        await client.graph();
        throw new Error("unexpected success");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(status);
        expect((error as Error).message).not.toContain("internal-key");
      }
    },
  );
  it("does not manufacture a response when offline", async () => {
    const client = new ApiClient(
      "https://api.example.com/api/v1",
      vi.fn().mockRejectedValue(new TypeError("offline")),
    );
    await expect(client.graph()).rejects.toMatchObject({
      kind: "network",
      status: 0,
    });
  });
  it("has a bounded timeout", async () => {
    const client = new ApiClient(
      "https://api.example.com/api/v1",
      vi.fn(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) =>
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      ),
    );
    await expect(
      client.request("/health", undefined, undefined, undefined, 5),
    ).rejects.toMatchObject({ kind: "timeout" });
  });
  it("preserves external cancellation without converting it into a learner error", async () => {
    const abort = new AbortController();
    abort.abort();
    const client = new ApiClient(
      "https://api.example.com/api/v1",
      vi.fn((_url, init) => Promise.reject(init?.signal?.reason)),
    );
    await expect(client.graph(abort.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});

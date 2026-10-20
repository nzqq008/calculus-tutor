import type {
  AnswerRequest,
  AnswerResponse,
  ChatMessage,
  Concept,
  Guidance,
  KnowledgeGraph,
  LearningSummary,
  Lesson,
  Mastery,
  PracticeResponse,
  Question,
  Session,
  Student,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public kind = "http",
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function normalizeBase(value: string): string {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/\/api\/v1\/?$/.test(url.pathname)
  ) {
    throw new Error("后端地址必须是以 /api/v1 结尾的 HTTP(S) 地址。");
  }
  return value.replace(/\/$/, "");
}
export const configuredBase =
  (import.meta.env.VITE_API_BASE_URL === "/api/v1"
    ? `${window.location.origin}/api/v1`
    : import.meta.env.VITE_API_BASE_URL) ||
  (import.meta.env.DEV ? `${window.location.origin}/api/v1` : "");
function configuration() {
  try {
    return { base: normalizeBase(configuredBase), error: "" };
  } catch {
    return {
      base: "",
      error:
        "尚未配置可用的后端地址。请设置 VITE_API_BASE_URL（包括 /api/v1）后重新构建。",
    };
  }
}
export const apiConfig = configuration();

export class ApiClient {
  constructor(
    public base: string,
    private fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}
  async request<T>(
    path: string,
    token?: string,
    body?: unknown,
    signal?: AbortSignal,
    timeoutMs = 200000,
  ): Promise<T> {
    if (!this.base) throw new ApiError(0, apiConfig.error, "configuration");
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      const response = await this.fetcher(`${this.base}${path}`, {
        method: body === undefined ? "GET" : "POST",
        signal: controller.signal,
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        // Do not display server internals or raw user data from an error body.
        const messages: Record<number, string> = {
          403: "学习身份已失效或无权访问。可以返回首页重置匿名身份。",
          404: "当前题目或学习内容不存在，请重新同步进度。",
          409: "当前进度已变化，请重新同步会话后继续。",
          422: "提交内容不符合要求，请检查输入。",
          429: "提问过于频繁或本次额度已用完，请稍后再试。",
        };
        throw new ApiError(
          response.status,
          messages[response.status] || "服务暂时无法完成请求，请稍后重试。",
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      throw new ApiError(
        0,
        timedOut
          ? "请求超时，结果尚未确认。请重试原提交或同步进度。"
          : "无法连接教学服务。请检查网络与后端服务，再重试。",
        timedOut ? "timeout" : "network",
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  graph = (signal?: AbortSignal) =>
    this.request<KnowledgeGraph>(
      "/knowledge-graph",
      undefined,
      undefined,
      signal,
      15000,
    );
  concept = (id: string, signal?: AbortSignal) =>
    this.request<Concept>(
      `/concepts/${encodeURIComponent(id)}`,
      undefined,
      undefined,
      signal,
      15000,
    );
  student = () => this.request<Student>("/students", undefined, {});
  mastery = (student: Student, signal?: AbortSignal) =>
    this.request<{ student_id: string; concepts: Mastery[] }>(
      `/students/${student.student_id}/mastery`,
      student.access_token,
      undefined,
      signal,
      15000,
    );
  createSession = (student: Student, id: string) =>
    this.request<Session>("/sessions", student.access_token, {
      student_id: student.student_id,
      concept_id: id,
    });
  session = (student: Student, id: string, signal?: AbortSignal) =>
    this.request<Session>(
      `/sessions/${id}`,
      student.access_token,
      undefined,
      signal,
      15000,
    );
  summary = (student: Student, id: string, signal?: AbortSignal) =>
    this.request<LearningSummary>(
      `/sessions/${id}/learning-summary`,
      student.access_token,
      undefined,
      signal,
      15000,
    );
  question = (student: Student, id: string, signal?: AbortSignal) =>
    this.request<Question>(
      `/sessions/${id}/question`,
      student.access_token,
      undefined,
      signal,
    );
  answer = (
    student: Student,
    id: string,
    body: AnswerRequest,
    practice = false,
  ) =>
    practice
      ? this.request<PracticeResponse>(
          `/sessions/${id}/practice/answers`,
          student.access_token,
          body,
        )
      : this.request<AnswerResponse>(
          `/sessions/${id}/answers`,
          student.access_token,
          body,
        );
  guidance = (student: Student, id: string, signal?: AbortSignal) =>
    this.request<Guidance>(
      `/sessions/${id}/guidance`,
      student.access_token,
      undefined,
      signal,
    );
  complete = (student: Student, id: string) =>
    this.request<Session>(
      `/sessions/${id}/guidance/complete`,
      student.access_token,
      {},
    );
  lesson = (student: Student, id: string, signal?: AbortSignal) =>
    this.request<Lesson>(
      `/sessions/${id}/lesson`,
      student.access_token,
      undefined,
      signal,
      15000,
    );
  completeLesson = (student: Student, id: string) =>
    this.request<Session>(
      `/sessions/${id}/lesson/complete`,
      student.access_token,
      {},
    );
  resumeDiagnosis = (student: Student, id: string) =>
    this.request<Session>(
      `/sessions/${id}/resume-diagnosis`,
      student.access_token,
      {},
    );
  message = (student: Student, id: string, message: string) =>
    this.request<ChatMessage & { phase: string }>(
      `/sessions/${id}/messages`,
      student.access_token,
      { message },
    );
  practice = (
    student: Student,
    id: string,
    questionId?: string,
    signal?: AbortSignal,
  ) =>
    this.request<Question>(
      `/sessions/${id}/practice/question${questionId ? `?question_id=${encodeURIComponent(questionId)}` : ""}`,
      student.access_token,
      undefined,
      signal,
    );
}
export const api = new ApiClient(apiConfig.base);

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react";
import { api } from "../api/client";
import type { ChatMessage, LearningSummary } from "../api/types";
import { useIdentity } from "../state/identity";
import { ErrorNotice } from "./Status";
import { MathText } from "./MathText";

export function Assistant({
  id,
  summary,
  teaching,
  learning = false,
}: {
  id: string;
  summary?: LearningSummary;
  teaching: boolean;
  learning?: boolean;
}) {
  const {
    identity: { student },
  } = useIdentity();
  const queries = useQueryClient();
  const [message, setMessage] = useState("");
  const [local, setLocal] = useState<ChatMessage[]>([]);
  const send = useMutation({
    mutationFn: async () => {
      const question = message.trim();
      const result = await api.message(student!, id, question);
      setLocal((old) => [...old, { role: "user", content: question }, result]);
      setMessage("");
      return result;
    },
    onSuccess: async () => {
      await queries.invalidateQueries({
        queryKey: ["student", student?.student_id, "summary", id],
      });
      setLocal([]);
    },
  });
  const messages = [...(summary?.messages || []), ...local];
  return (
    <aside className="assistant-panel" aria-label="AI 教学助手">
      <div className="assistant-heading">
        <span className="assistant-icon">
          <Sparkles size={20} />
        </span>
        <div>
          <h2>学习搭子</h2>
          <p>陪你把每一步想明白</p>
        </div>
        <span className={`assistant-state ${teaching ? "online" : ""}`}>
          {teaching ? "可提问" : "待教学"}
        </span>
      </div>
      <div className="assistant-chat" role="log" aria-live="polite">
        {messages.length ? (
          messages.map((m, i) => (
            <div
              key={i}
              className={`chat-bubble ${m.role === "user" ? "user" : "assistant"}`}
            >
              <span className="chat-role">
                {m.role === "user" ? "你" : "教学助手"}
              </span>
              <MathText text={m.content} />
            </div>
          ))
        ) : (
          <div className="assistant-welcome">
            <MessageCircle size={29} />
            <h3>
              不止得到答案，
              <br />
              也理解为什么。
            </h3>
            <p>
              {learning
                ? "先看中间的基础讲解。任何一步不明白，都可以在这里提问，准备好后再开始挑战。"
                : teaching
                  ? "读完中间的讲解，可以在这里追问任何不明白的步骤。"
                  : "挑战时先独立作答。进入针对性教学后，可以在这里继续追问。"}
            </p>
          </div>
        )}
        {send.isPending && (
          <div className="chat-bubble assistant" role="status">
            正在认真组织讲解…
          </div>
        )}
      </div>
      {send.isError && <ErrorNotice error={send.error} />}
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (teaching && message.trim() && !send.isPending) send.mutate();
        }}
      >
        <label className="sr-only" htmlFor="chat-message">
          向教学助手提问
        </label>
        <textarea
          id="chat-message"
          rows={3}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!teaching || send.isPending}
          placeholder={
            teaching ? "这一处为什么要这样求导？" : "学习或补救阶段可以提问…"
          }
        />
        <div>
          <span>{message.length}/2000</span>
          <button
            type="submit"
            aria-label="发送提问"
            disabled={!teaching || !message.trim() || send.isPending}
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </form>
      <p className="caption assistant-note">
        依据当前学习内容回答 · 教学结论以测评为准
      </p>
    </aside>
  );
}

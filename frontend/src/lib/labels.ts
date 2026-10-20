import type { MasteryStatus, Phase } from "../api/types";
export type DisplayMastery = "not_started" | "in_progress" | "mastered";
export function displayMastery(status: MasteryStatus): DisplayMastery {
  return status === "mastered"
    ? "mastered"
    : status === "unknown"
      ? "not_started"
      : "in_progress";
}
export const displayMasteryLabels: Record<DisplayMastery, string> = {
  not_started: "待学习",
  in_progress: "学习中",
  mastered: "已掌握",
};
export const masteryLabels: Record<MasteryStatus, string> = {
  unknown: "待学习",
  assessing: "学习中",
  partial: "学习中",
  unmastered: "学习中",
  inferred_mastered: "关联基础待验证",
  mastered: "已掌握",
};
export const phaseLabels: Record<Phase, string> = {
  learning: "学习基础知识",
  initial_assessment: "关卡挑战",
  diagnosing: "进一步了解问题",
  teaching: "针对性学习",
  verifying: "检验学习收获",
  mastery_check: "掌握测评",
  completed: "关卡挑战通过",
  paused: "学习暂告一段落",
  needs_review: "需要进一步帮助",
};
export const purposeLabels: Record<string, string> = {
  mastery: "知识测评",
  diagnostic: "诊断问题",
  verification: "教学后验证",
  practice: "自主练习",
};
export function studentText(value: string): string {
  // Never expose research identifiers even if an LLM happens to mention one.
  return value.replace(/(?:K\d+-)?\b(?:M\d+|G\d+|S\d+)\b/g, "当前学习内容");
}

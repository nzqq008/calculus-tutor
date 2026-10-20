// Public backend contract: api/schemas.py, routes/graph.py, routes/learning.py.
export type MasteryStatus =
  | "unknown"
  | "assessing"
  | "partial"
  | "unmastered"
  | "inferred_mastered"
  | "mastered";
export type Phase =
  | "learning"
  | "initial_assessment"
  | "diagnosing"
  | "teaching"
  | "verifying"
  | "mastery_check"
  | "completed"
  | "paused"
  | "needs_review";
export interface GraphNode {
  id: string;
  name?: string | null;
  type?: string | null;
  label?: string | null;
}
export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: { source: string; target: string; type?: string | null }[];
}
export interface Mastery {
  concept_id: string;
  status: MasteryStatus;
  display_status?: "not_started" | "in_progress" | "mastered";
  evidence_type: string | null;
  evidence_ids: string[];
  inferred_from?: string | null;
}
export interface Student {
  student_id: string;
  access_token: string;
  token_type: string;
}
export interface Concept {
  id: string;
  name: string;
  description: string;
  prerequisites: string[];
  next_concepts: string[];
  assessments: { question_id: string }[];
}
export interface Session {
  session_id: string;
  target_concept: string;
  active_concept: string;
  phase: Phase;
  status: string;
  round_count: number;
  revision?: number;
  verification_kind?: string;
  verification_total?: number;
  verification_remaining?: number;
  learning_stack: string[];
  candidate_misconceptions: string[];
  cognitive_states: Record<string, string | null>;
  next_action:
    | "show_lesson"
    | "answer_question"
    | "show_guidance"
    | "completed"
    | "paused"
    | "needs_review";
  next_question_id: string | null;
  guidance_id: string | null;
  reason: string;
  recommendations: string[];
}
export interface Question {
  stage_label?: string | null;
  question_id: string;
  concept_id: string;
  assignment_id: string;
  type: "multiple_choice" | "multi_select" | "expression" | "open_answer";
  purpose: "mastery" | "diagnostic" | "practice" | "verification";
  stem: string;
  difficulty: number;
  options?: { id: string; text: string }[] | null;
}
export type Answer = string | string[];
export interface AnswerRequest {
  request_id: string;
  question_id: string;
  assignment_id: string;
  answer: Answer;
}
export interface Grading {
  status: "correct" | "incorrect" | "needs_review";
  is_correct: boolean | null;
  feedback: string;
  evidence: string[];
}
export interface AnswerResponse extends Session {
  grading: Grading;
}
export interface Guidance {
  guidance_id: string;
  action_type: string;
  content: string;
  formulas: string[];
  latex_formulas: string[];
  followup_prompt: string;
  fallback: boolean;
}
export interface Lesson {
  concept_id: string;
  version: number;
  title: string;
  objectives: string[];
  sections: { heading: string; content: string }[];
  example: { stem: string; steps: string[] };
  formulas: string[];
  checkpoint: string;
}
export interface ChatMessage {
  role: string;
  content: string;
}
export interface Diagnosis {
  descriptions: string[];
  confirmed: boolean;
  needs_more_evidence: boolean;
  concept_name: string;
  details?: {
    title: string;
    interpretation: string;
    distinguish_from: string;
    diagnostic_steps: string[];
    repair_goal: string;
    evidence: { stem: string; answer: string; reasoning: string }[];
  }[];
}
export interface LearningSummary {
  skills: {
    id: string;
    label: string;
    status: string;
    passed_checks: number;
    required_checks: number;
  }[];
  confirmed_skill_count: number;
  lessons: { concept_name: string; title: string; version: number }[];
  learning_path: {
    current: string;
    goal: string;
    objective: string;
    basis: string;
  } | null;
  inference_message: string | null;
  practice_questions: Pick<Question, "question_id" | "stem" | "type">[];
  target_name: string;
  active_name: string;
  message: string;
  remediation_reason: string | null;
  diagnosis: Diagnosis;
  diagnostic_process?: { stage: string; purpose: string; next_step: string };
  attempt_count: number;
  viewed_explanations?: number;
  completed_checks?: number;
  prerequisite_plan?: {
    parent: string;
    concept: string;
    status: string;
    checked?: string;
    required?: string;
  }[];
  repair_path?: string[];
  assessment_answered: number;
  assessment_total: number;
  attempts: {
    stage_label?: string;
    stem: string;
    answer: Answer;
    grading_status: Grading["status"];
    concept_name: string;
    purpose: Question["purpose"];
    created_at: string;
  }[];
  diagnoses: Diagnosis[];
  guidances: { content: string; concept_name: string; created_at: string }[];
  messages: ChatMessage[];
}
export interface PracticeResponse {
  question_id: string;
  grading: Grading;
  phase: Phase;
  updates_mastery: boolean;
}

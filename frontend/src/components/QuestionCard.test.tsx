import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { Question } from "../api/types";
import { QuestionCard } from "./QuestionCard";
const base: Question = {
  question_id: "q",
  assignment_id: "a",
  concept_id: "K3",
  type: "multiple_choice",
  purpose: "diagnostic",
  stem: "请选择",
  difficulty: 1,
  options: [
    { id: "A", text: "第一个选项" },
    { id: "B", text: "第二个选项" },
  ],
};
describe("QuestionCard", () => {
  it("varies visible option order while preserving backend answer IDs", () => {
    const send = vi.fn();
    const view = render(
      <QuestionCard
        question={{ ...base, assignment_id: "a" }}
        busy={false}
        onSubmit={send}
      />,
    );
    expect(screen.getAllByRole("radio")[0]).toHaveAttribute("value", "B");
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: "提交答案" }));
    expect(send).toHaveBeenCalledWith("B");
    view.rerender(
      <QuestionCard
        question={{ ...base, assignment_id: "b" }}
        busy={false}
        onSubmit={send}
      />,
    );
    expect(screen.getAllByRole("radio")[0]).toHaveAttribute("value", "A");
  });
  it("prevents empty and in-flight submissions", () => {
    const send = vi.fn();
    const view = render(
      <QuestionCard question={base} busy={false} onSubmit={send} />,
    );
    expect(screen.getByRole("button", { name: "提交答案" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /第一个选项/ }));
    fireEvent.click(screen.getByRole("button", { name: "提交答案" }));
    expect(send).toHaveBeenCalledWith("A");
    view.rerender(<QuestionCard question={base} busy onSubmit={send} />);
    expect(screen.getByRole("button", { name: "正在提交…" })).toBeDisabled();
  });
  it("submits a multiselect array", () => {
    const send = vi.fn();
    render(
      <QuestionCard
        question={{ ...base, type: "multi_select" }}
        busy={false}
        onSubmit={send}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /第一个选项/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /第二个选项/ }));
    fireEvent.click(screen.getByRole("button", { name: "提交答案" }));
    expect(send).toHaveBeenCalledWith(["A", "B"]);
  });
  it.each(["expression", "open_answer"] as const)(
    "supports %s without local grading",
    (type) => {
      const send = vi.fn();
      render(
        <QuestionCard
          question={{ ...base, type, options: null }}
          busy={false}
          onSubmit={send}
        />,
      );
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "x^2" },
      });
      fireEvent.click(screen.getByRole("button", { name: "提交答案" }));
      expect(send).toHaveBeenCalledWith("x^2");
      expect(screen.queryByText(/已掌握/)).not.toBeInTheDocument();
    },
  );
});

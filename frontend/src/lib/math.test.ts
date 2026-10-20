import { it, expect } from "vitest";
import { expressionLatex } from "./math";
it("renders nested expressions and fractions without evaluating answers", () => {
  expect(expressionLatex("2*x*cos(x^2)")).toBe(
    "2\\,x\\,\\cos\\left({x}^{2}\\right)",
  );
  expect(expressionLatex("sqrt(1+exp(sin(x)))")).toContain(
    "\\sqrt{1+\\exp\\left(\\sin\\left(x\\right)\\right)}",
  );
  expect(expressionLatex("1/(1+x^2)")).toContain("\\frac{1}");
  expect(expressionLatex("<script>alert(1)</script>")).toBeNull();
  expect(expressionLatex("x".repeat(301))).toBeNull();
});

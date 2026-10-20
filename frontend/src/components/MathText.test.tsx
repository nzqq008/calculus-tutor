import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { Formula, MathText } from "./MathText";
it("renders math and keeps arbitrary model HTML inert", () => {
  const { container } = render(
    <>
      <Formula value="\\frac{dy}{dx}=2x" />
      <MathText text={"<img src=x onerror=alert(1)> K3-M1 M2 G31 $x^2$"} />
    </>,
  );
  expect(container.querySelector(".katex")).not.toBeNull();
  expect(container.querySelector("img")).toBeNull();
  expect(screen.queryByText(/K3-M1/)).not.toBeInTheDocument();
  expect(container.textContent).not.toMatch(/M2|G31/);
});
it("renders a parenthesized backend expression in prose", () => {
  const { container } = render(<MathText text="求 (x^2+1)^3 的导数。" />);
  expect(container.querySelectorAll(".katex")).toHaveLength(1);
});

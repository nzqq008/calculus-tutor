import { useMemo } from "react";
import katex from "katex";
import { studentText } from "../lib/labels";
import { expressionLatex } from "../lib/math";

export function Formula({
  value,
  block = false,
}: {
  value: string;
  block?: boolean;
}) {
  const html = useMemo(
    () =>
      katex.renderToString(value, {
        displayMode: block,
        throwOnError: false,
        trust: false,
        strict: "warn",
        maxExpand: 1000,
      }),
    [value, block],
  );
  // KaTeX escapes text and rejects HTML commands with trust:false. Never insert raw model HTML.
  return (
    <span
      className={block ? "formula block" : "formula"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
export function MathText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const safe = studentText(text);
  const parts = safe.split(
    /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g,
  );
  return (
    <div className={`math-text ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") || part.startsWith("\\["))
          return <Formula key={index} value={part.slice(2, -2)} block />;
        if (part.startsWith("$"))
          return <Formula key={index} value={part.slice(1, -1)} />;
        if (part.startsWith("\\("))
          return <Formula key={index} value={part.slice(2, -2)} />;
        return (
          <span key={index}>
            {part
              .split(/([A-Za-z0-9(][A-Za-z0-9_+\-*/^().=' \t]*)/g)
              .filter(Boolean)
              .map((piece, i) => {
                const trimmed = piece.trim();
                const latex =
                  /[xunygf]/.test(trimmed) && /[()+*/^=]/.test(trimmed)
                    ? expressionLatex(trimmed)
                    : null;
                return latex ? (
                  <Formula key={i} value={latex} />
                ) : (
                  <span key={i}>{piece}</span>
                );
              })}
          </span>
        );
      })}
    </div>
  );
}
export function OptionText({ text }: { text: string }) {
  // Plain expression options use the backend's Python-style notation. Keep prose as text.
  if (/^[\da-zA-Z_+\-*/^()., =]+$/.test(text) && /[x()+*/^]/.test(text)) {
    const latex = expressionLatex(text);
    if (latex) return <Formula value={latex} />;
  }
  return <MathText text={text} />;
}

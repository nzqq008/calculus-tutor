// A small display-only parser. It never evaluates input or decides mathematical correctness.
export function expressionLatex(input: string): string | null {
  const text = input.replace(/\s/g, "");
  if (!text || text.length > 300) return null;
  const tokens = text.match(/\d+(?:\.\d+)?|[a-zA-Z]+|\*\*|[+'\-*/^(),=]/g);
  if (!tokens || tokens.join("") !== text) return null;
  let index = 0;
  function parse(min = 0, depth = 0): string {
    if (depth > 18) throw new Error("depth");
    const token = tokens![index++];
    let left: string;
    if (token === "-" || token === "+") left = token + parse(4, depth + 1);
    else if (token === "(") {
      left = `\\left(${parse(0, depth + 1)}\\right)`;
      if (tokens![index++] !== ")") throw new Error("parentheses");
    } else if (token && /^[\da-zA-Z]/.test(token)) {
      left = token === "pi" ? "\\pi" : token;
      if (tokens![index] === "'") {
        index++;
        left += "^{\\prime}";
      }
      if (tokens![index] === "(") {
        index++;
        const arg = parse(0, depth + 1);
        if (tokens![index++] !== ")") throw new Error("parentheses");
        left =
          token === "sqrt"
            ? `\\sqrt{${arg}}`
            : (["sin", "cos", "exp", "ln", "log"].includes(token)
                ? `\\${token}`
                : left) + `\\left(${arg}\\right)`;
      }
    } else throw new Error("token");
    while (index < tokens!.length) {
      const op = tokens![index];
      const precedence = (
        { "=": 1, "+": 2, "-": 2, "*": 3, "/": 3, "^": 4, "**": 4 } as Record<
          string,
          number
        >
      )[op];
      if (precedence === undefined || precedence < min) break;
      index++;
      const right = parse(
        precedence + (["^", "**"].includes(op) ? 0 : 1),
        depth + 1,
      );
      left =
        op === "/"
          ? `\\frac{${left}}{${right}}`
          : ["^", "**"].includes(op)
            ? `{${left}}^{${right}}`
            : op === "*"
              ? `${left}\\,${right}`
              : `${left}${op}${right}`;
    }
    return left;
  }
  try {
    const result = parse();
    return index === tokens.length ? result : null;
  } catch {
    return null;
  }
}

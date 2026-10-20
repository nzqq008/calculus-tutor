import { MathText } from "./MathText";

/** Keep authored sections readable while accepting ordinary model prose as well. */
export function TeachingArticle({ text }: { text: string }) {
  return (
    <div className="teaching-article">
      {text
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph, index) => {
          const section = paragraph.match(/^【([^】\n]+)】\n([\s\S]*)$/);
          return section ? (
            <section key={index} className="teaching-section">
              <h3>{section[1]}</h3>
              <MathText text={section[2]} />
            </section>
          ) : (
            <MathText key={index} text={paragraph} />
          );
        })}
    </div>
  );
}

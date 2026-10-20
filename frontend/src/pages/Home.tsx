import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Leaf,
} from "lucide-react";
import { api, apiConfig } from "../api/client";
import { useIdentity } from "../state/identity";
import { useGraph, useMastery } from "../state/queries";
import { masteryLabels } from "../lib/labels";
import { KnowledgeNetwork } from "../components/KnowledgeNetwork";
import { ErrorNotice, Loading } from "../components/Status";

export function Home() {
  const graph = useGraph(),
    mastery = useMastery();
  const { identity, setStudent, remember } = useIdentity();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selected = params.get("concept") || "K3";
  const setSelected = (id: string) => {
    if (!start.isPending) setParams({ concept: id });
  };
  const concept = useQuery({
    queryKey: ["concept", selected],
    queryFn: ({ signal }) => api.concept(selected, signal),
    enabled: !!apiConfig.base,
  });
  const saved = identity.sessions.find((s) => s.concept === selected);
  const start = useMutation({
    mutationFn: async (forceNew: boolean) => {
      let student = identity.student;
      if (!student) {
        student = await api.student();
        setStudent(student);
      }
      if (saved && !forceNew) {
        await api.session(student, saved.id);
        remember(saved);
        navigate(`/learn/${saved.id}`);
        return;
      }
      const session = await api.createSession(student, selected);
      remember({
        id: session.session_id,
        concept: selected,
        name: concept.data?.name || selected,
        createdAt: new Date().toISOString(),
      });
      navigate(`/learn/${session.session_id}`);
    },
  });
  const mastered =
    mastery.data?.concepts.filter((m) => m.status === "mastered").length || 0;
  const inferred =
    mastery.data?.concepts.filter((m) => m.status === "inferred_mastered")
      .length || 0;
  const current = identity.sessions.find((s) => s.id === identity.current);
  const status =
    mastery.data?.concepts.find((m) => m.concept_id === selected)?.status ||
    "unknown";
  const names = (id: string) =>
    graph.data?.nodes.find((n) => n.id === id)?.name || id;
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Leaf size={15} /> YOUR OWN LEARNING PATH
          </span>
          <h1>
            把微积分，
            <br />
            <em>一点点学明白。</em>
          </h1>
          <p>
            从一个知识点出发。用真实测评找到卡住的地方，
            <br className="desktop-only" />
            沿着知识的联系，把不懂的环节一步步补上。
          </p>
          <div className="hero-actions">
            <a
              className="button primary"
              href="#explore"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("explore")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              探索知识网络 <ArrowRight size={18} />
            </a>
            {current && (
              <Link className="button secondary" to={`/learn/${current.id}`}>
                继续上次学习
              </Link>
            )}
          </div>
          <div className="hero-points">
            <span>
              <CheckCircle2 size={15} />
              依据答题证据
            </span>
            <span>
              <Compass size={15} />
              适合你的节奏
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit one" />
          <div className="orbit two" />
          <span className="art-note note-a">理解结构</span>
          <span className="art-note note-b">连接知识</span>
          <svg viewBox="0 0 460 290">
            <defs>
              <pattern
                id="grid"
                width="28"
                height="28"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 28 0 L 0 0 0 28"
                  fill="none"
                  stroke="#d5e5dd"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="460" height="290" fill="url(#grid)" />
            <path
              d="M25 220H430M65 270V25"
              stroke="#a2bdb3"
              strokeWidth="1.5"
            />
            <path
              d="M60 220C140 220 155 200 210 160S295 55 410 42"
              fill="none"
              stroke="#1a7967"
              strokeWidth="4"
            />
            <path
              d="M130 230L350 57"
              stroke="#d6ab57"
              strokeWidth="2"
              strokeDasharray="7 7"
            />
            <circle
              cx="245"
              cy="139"
              r="8"
              fill="#fff"
              stroke="#1a7967"
              strokeWidth="4"
            />
          </svg>
          <div className="art-equation">f′(g(x)) · g′(x)</div>
          <span className="art-caption">每一次理解，都让下一步更清晰。</span>
        </div>
      </section>
      <section className="home-stats">
        <div>
          <BookOpen size={20} />
          <span>
            <strong>{graph.data?.nodes.length ?? "—"}</strong>{" "}
            个相互联系的知识点
          </span>
        </div>
        <div>
          <CheckCircle2 size={20} />
          <span>
            <strong>{identity.student ? mastered : "—"}</strong>{" "}
            个知识点已独立通关
            {identity.student && (
              <small>（另有 {inferred} 项关联基础待验证）</small>
            )}
          </span>
        </div>
        <div>
          <Compass size={20} />
          <span>从任意知识点开始，按证据安排路径</span>
        </div>
      </section>
      {apiConfig.error && <ErrorNotice error={new Error(apiConfig.error)} />}
      {graph.isError && (
        <ErrorNotice error={graph.error} retry={() => void graph.refetch()} />
      )}
      {mastery.isError && (
        <ErrorNotice
          error={mastery.error}
          retry={() => void mastery.refetch()}
        />
      )}
      <div id="explore" className="home-explore">
        {graph.isPending && apiConfig.base ? (
          <Loading text="正在连接知识网络…" />
        ) : (
          graph.data && (
            <KnowledgeNetwork
              graph={graph.data}
              mastery={mastery.data?.concepts}
              selected={selected}
              onSelect={setSelected}
            />
          )
        )}
        <section className="concept-detail card" aria-label="知识点详情">
          <span className="eyebrow">YOUR NEXT STEP</span>
          {concept.isPending && apiConfig.base ? (
            <Loading />
          ) : concept.isError ? (
            <ErrorNotice
              error={concept.error}
              retry={() => void concept.refetch()}
            />
          ) : (
            concept.data && (
              <>
                <div className="concept-title">
                  <h2>{concept.data.name}</h2>
                  <span className={`mastery-badge ${status}`}>
                    {masteryLabels[status]}
                  </span>
                </div>
                <p className="detail-description">{concept.data.description}</p>
                {status === "inferred_mastered" && (
                  <p className="notice inference-message">
                    后续知识点已通过测评，但这不代表本知识点已独立通关。可以进入本关学习和检验。
                  </p>
                )}
                <div className="detail-block">
                  <span className="field-label">相关基础</span>
                  <div className="tag-list">
                    {concept.data.prerequisites.length ? (
                      concept.data.prerequisites.map((id) => (
                        <button
                          className="tag clickable"
                          key={id}
                          onClick={() => setSelected(id)}
                        >
                          {names(id)}
                        </button>
                      ))
                    ) : (
                      <span className="muted">
                        可以直接开始，无需其他前置知识。
                      </span>
                    )}
                  </div>
                </div>
                <div className="detail-block">
                  <span className="field-label">这一站的学习方式</span>
                  <p>
                    先学习基础讲解和分步例题，再开始挑战。答错时按具体误解补救并复测，只有关键技能验证通过，才会点亮当前知识点。
                  </p>
                </div>
                {start.isError && <ErrorNotice error={start.error} />}
                <button
                  className="button primary full"
                  onClick={() => start.mutate(false)}
                  disabled={start.isPending || !!mastery.error}
                >
                  {start.isPending
                    ? "正在准备关卡…"
                    : saved
                      ? status === "mastered"
                        ? "查看本关记录"
                        : "继续本关学习"
                      : "进入关卡学习"}
                  <ArrowRight size={18} />
                </button>
                {saved && (
                  <button
                    className="text-link restart-level"
                    disabled={start.isPending}
                    onClick={() => start.mutate(true)}
                  >
                    从头开始新一轮（保留原记录）
                  </button>
                )}
              </>
            )
          )}
        </section>
      </div>
      {!!identity.sessions.length && (
        <section className="local-sessions">
          <div className="section-heading">
            <div>
              <span className="eyebrow">KEEP GOING</span>
              <h2>本机学习记录</h2>
            </div>
            <span className="caption">仅包含此浏览器创建或访问过的会话</span>
          </div>
          <div className="session-list">
            {identity.sessions.slice(0, 6).map((s) => (
              <Link key={s.id} to={`/learn/${s.id}`} className="session-link">
                <BookOpen size={18} />
                <div>
                  <strong>{s.name}</strong>
                  <span>{new Date(s.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

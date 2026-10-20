import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Circle, Focus } from "lucide-react";
import type { KnowledgeGraph, Mastery } from "../api/types";
import { displayMastery, displayMasteryLabels } from "../lib/labels";

const emptyMastery: Mastery[] = [];

export function KnowledgeNetwork({
  graph,
  mastery = emptyMastery,
  selected,
  active,
  onSelect,
}: {
  graph: KnowledgeGraph;
  mastery?: Mastery[];
  selected?: string;
  active?: string;
  onSelect: (id: string) => void;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);
  const markerId = `knowledge-arrow-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);
  const layout = useMemo(() => {
    const levels = new Map<string, number>();
    function level(id: string, visiting = new Set<string>()): number {
      if (levels.has(id)) return levels.get(id)!;
      if (visiting.has(id)) return 0;
      const parents = graph.edges.filter((e) => e.target === id);
      const next = new Set(visiting).add(id);
      const result = parents.length
        ? 1 + Math.max(...parents.map((e) => level(e.source, next)))
        : 0;
      levels.set(id, result);
      return result;
    }
    const rows = new Map<number, string[]>();
    graph.nodes.forEach((node) =>
      rows.set(level(node.id), [...(rows.get(level(node.id)) || []), node.id]),
    );
    const columns = Math.max(1, ...[...rows.values()].map((row) => row.length));
    const usable = Math.max(160, width - 24);
    const nodeWidth = Math.min(180, (usable - (columns - 1) * 24) / columns);
    const nodes = graph.nodes.map((node) => {
      const row = rows.get(level(node.id))!;
      const rowWidth = row.length * nodeWidth + (row.length - 1) * 24;
      return {
        ...node,
        x: (usable - rowWidth) / 2 + row.indexOf(node.id) * (nodeWidth + 24),
        y: level(node.id) * 132,
      };
    });
    const edges = graph.edges.map((edge) => {
      const source = nodes.find((n) => n.id === edge.source)!;
      const target = nodes.find((n) => n.id === edge.target)!;
      const bypass = level(target.id) - level(source.id) > 1;
      if (bypass) {
        const sx = source.x + nodeWidth,
          sy = source.y + 40;
        const tx = target.x + nodeWidth,
          ty = target.y + 40;
        const lane = width - 6;
        return {
          ...edge,
          bypass,
          path: `M ${sx} ${sy} H ${lane - 9} Q ${lane} ${sy} ${lane} ${sy + 9} V ${ty - 9} Q ${lane} ${ty} ${lane - 9} ${ty} H ${tx}`,
        };
      }
      const parents = graph.edges
        .filter(
          (e) =>
            e.target === target.id && level(e.source) === level(target.id) - 1,
        )
        .sort(
          (a, b) =>
            nodes.find((n) => n.id === a.source)!.x -
            nodes.find((n) => n.id === b.source)!.x,
        );
      const children = graph.edges
        .filter(
          (e) =>
            e.source === source.id && level(e.target) === level(source.id) + 1,
        )
        .sort(
          (a, b) =>
            nodes.find((n) => n.id === a.target)!.x -
            nodes.find((n) => n.id === b.target)!.x,
        );
      const sx =
        source.x +
        nodeWidth *
          (children.length > 1
            ? (children.findIndex((e) => e.target === target.id) + 1) /
              (children.length + 1)
            : 0.5);
      const tx =
        target.x +
        nodeWidth *
          (parents.length > 1
            ? (parents.findIndex((e) => e.source === source.id) + 1) /
              (parents.length + 1)
            : 0.5);
      const sy = source.y + 80,
        ty = target.y,
        middle = (sy + ty) / 2;
      return {
        ...edge,
        bypass,
        path: `M ${sx} ${sy} C ${sx} ${middle}, ${tx} ${middle}, ${tx} ${ty}`,
      };
    });
    return {
      nodes,
      edges,
      nodeWidth,
      height: Math.max(80, ...nodes.map((n) => n.y + 80)),
    };
  }, [graph, width]);
  return (
    <section className="network-card" aria-label="微积分知识依赖网络">
      <div className="section-heading">
        <div>
          <span className="eyebrow">KNOWLEDGE MAP</span>
          <h2>让知识，连接起来</h2>
        </div>
        <span className="muted small-text">点击节点探索</span>
      </div>
      <div
        ref={canvas}
        className="network-canvas"
        data-testid="knowledge-network"
        style={{ height: layout.height }}
      >
        <svg
          className="knowledge-connections"
          width={width}
          height={layout.height}
          viewBox={`0 0 ${width} ${layout.height}`}
          role="img"
          aria-label="箭头从前置知识指向后续知识"
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 1 1 L 7 4 L 1 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </marker>
          </defs>
          {layout.edges.map((edge) => (
            <path
              key={`${edge.source}-${edge.target}`}
              data-source={edge.source}
              data-target={edge.target}
              data-route={edge.bypass ? "outer" : "adjacent"}
              d={edge.path}
              markerEnd={`url(#${markerId})`}
            />
          ))}
        </svg>
        {layout.nodes.map((node) => {
          const record = mastery.find((m) => m.concept_id === node.id);
          const status = record?.status || "unknown";
          const display = record?.display_status || displayMastery(status);
          const state =
            active === node.id && display === "not_started"
              ? "in_progress"
              : display;
          const Icon =
            state === "mastered"
              ? Check
              : state === "in_progress"
                ? Focus
                : Circle;
          return (
            <button
              type="button"
              key={node.id}
              className={`concept-node ${status} state-${state} ${active === node.id ? "active" : ""} ${selected === node.id ? "selected" : ""}`}
              style={{ left: node.x, top: node.y, width: layout.nodeWidth }}
              data-concept={node.id}
              aria-label={`${node.name}，${displayMasteryLabels[state]}${active === node.id ? "，当前学习" : ""}`}
              aria-current={active === node.id ? "step" : undefined}
              onClick={() => onSelect(node.id)}
            >
              <strong className="node-heading">{node.name || node.id}</strong>
              <span className="node-status">
                <Icon size={12} aria-hidden="true" />
                {displayMasteryLabels[state]}
              </span>
              {active === node.id && (
                <span className="node-current" aria-label="当前学习" />
              )}
            </button>
          );
        })}
      </div>
      <div className="network-legend" aria-label="三种学习状态">
        <span>
          <i className="legend-dot not-started" />
          待学习
        </span>
        <span>
          <i className="legend-dot in-progress" />
          学习中
        </span>
        <span>
          <i className="legend-dot mastered" />
          已掌握
        </span>
      </div>
      <p className="caption">
        箭头从基础指向后续知识。掌握依据可在学习报告中查看。
      </p>
    </section>
  );
}

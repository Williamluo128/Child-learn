import type { GraphEdge, GraphNode } from "./types";

// Simple layered (Sugiyama-lite) layout: x = longest-prereq-depth, y stacks
// nodes within each depth. Enough for the small grade-5 fraction subgraph;
// swap for dagre/elk when the real graph gets large.
export interface Positioned {
  id: string;
  x: number;
  y: number;
}

const COL = 300;
const ROW = 150;

export function layeredLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Record<string, Positioned> {
  const ids = nodes.map((n) => n.topic.id);
  const prereqsOf = new Map<string, string[]>();
  ids.forEach((id) => prereqsOf.set(id, []));
  edges.forEach((e) => {
    if (prereqsOf.has(e.to)) prereqsOf.get(e.to)!.push(e.from);
  });

  // longest path from a root (memoized)
  const depthCache = new Map<string, number>();
  function depth(id: string, seen: Set<string> = new Set()): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (seen.has(id)) return 0; // guard against cycles
    seen.add(id);
    const parents = prereqsOf.get(id) ?? [];
    const d = parents.length === 0 ? 0 : 1 + Math.max(...parents.map((p) => depth(p, seen)));
    depthCache.set(id, d);
    return d;
  }

  const byDepth = new Map<number, string[]>();
  ids.forEach((id) => {
    const d = depth(id);
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  });

  const pos: Record<string, Positioned> = {};
  byDepth.forEach((layerIds, d) => {
    const offset = ((layerIds.length - 1) * ROW) / 2;
    layerIds.forEach((id, i) => {
      pos[id] = { id, x: d * COL, y: i * ROW - offset };
    });
  });
  return pos;
}

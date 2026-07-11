"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import type { GraphResponse } from "@/lib/types";
import { layeredLayout } from "@/lib/graphLayout";
import { TopicNode, type TopicNodeData } from "./TopicNode";

const nodeTypes = { topic: TopicNode };

export function SkillGraph({ graph }: { graph: GraphResponse }) {
  const router = useRouter();

  const nodes: Node<TopicNodeData>[] = useMemo(() => {
    const pos = layeredLayout(graph.nodes, graph.edges);
    return graph.nodes.map((n) => ({
      id: n.topic.id,
      type: "topic",
      position: { x: pos[n.topic.id]?.x ?? 0, y: pos[n.topic.id]?.y ?? 0 },
      data: {
        name: n.topic.name,
        status: n.status === "locked" ? "unlockable" : n.status,
        ageLabel: `${n.topic.ageRangeStart}–${n.topic.ageRangeEnd}`,
      },
    }));
  }, [graph]);

  const edges: Edge[] = useMemo(
    () =>
      graph.edges.map((e) => ({
        id: `${e.from}->${e.to}`,
        source: e.from,
        target: e.to,
        animated: false,
        style: {
          stroke: e.strength === "hard" ? "#8b95a8" : "#c0c8d6",
          strokeWidth: e.strength === "hard" ? 2.5 : 2,
          strokeDasharray: e.strength === "soft" ? "5 4" : undefined,
        },
      })),
    [graph]
  );

  const onNodeClick: NodeMouseHandler = (_, node) => {
    router.push(`/learn/${node.id}`);
  };

  return (
    <div className="h-[65vh] w-full overflow-hidden bg-canvas/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnScroll
        zoomOnScroll
      >
        <Background color="#dce3ee" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

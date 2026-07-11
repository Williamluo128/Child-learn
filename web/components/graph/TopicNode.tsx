"use client";

import { Handle, Position } from "reactflow";
import { MASTERY_META } from "@/lib/mastery";
import type { MasteryStatus } from "@/lib/types";

export interface TopicNodeData {
  name: string;
  status: MasteryStatus;
  ageLabel: string;
}

export function TopicNode({ data }: { data: TopicNodeData }) {
  const status = data.status === "locked" ? "unlockable" : data.status;
  const meta = MASTERY_META[status];

  return (
    <div
      className="w-44 cursor-pointer rounded-card border-[3px] bg-surface px-4 py-3.5 shadow-card"
      style={{ borderColor: meta.color }}
    >
      <Handle type="target" position={Position.Left} className="!bg-line !border-0" />
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[15px] font-semibold leading-snug text-ink">
          {data.name}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-line !border-0" />
    </div>
  );
}

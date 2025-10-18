"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import type { MindMapNodeData } from "./types";
import { Brain, Lightbulb, FileText, StickyNote } from "lucide-react";

const nodeTypeIcons = {
  root: Brain,
  topic: Lightbulb,
  subtopic: FileText,
  note: StickyNote,
};

const nodeTypeStyles = {
  root: "text-lg font-bold px-6 py-4",
  topic: "text-base font-semibold px-4 py-3",
  subtopic: "text-sm font-medium px-3 py-2",
  note: "text-xs px-2 py-1",
};

function CustomNode({ data, selected }: NodeProps<MindMapNodeData>) {
  const Icon = nodeTypeIcons[data.nodeType] || Lightbulb;
  const baseColor = data.color || "#3b82f6";
  
  return (
    <div
      className={`
        relative rounded-lg shadow-md transition-all duration-200
        ${selected ? "ring-2 ring-offset-2 ring-blue-500 shadow-lg scale-105" : ""}
        ${nodeTypeStyles[data.nodeType]}
      `}
      style={{
        backgroundColor: baseColor + "20",
        borderColor: baseColor,
        borderWidth: "2px",
        borderStyle: "solid",
        minWidth: data.nodeType === "root" ? "180px" : data.nodeType === "topic" ? "140px" : "100px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-2 !h-2"
      />
      
      <div className="flex items-center gap-2">
        <Icon className="flex-shrink-0" size={data.nodeType === "root" ? 20 : 16} style={{ color: baseColor }} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 break-words">
            {data.label}
          </div>
          {data.content && data.nodeType !== "note" && (
            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
              {data.content}
            </div>
          )}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-2 !h-2"
      />
      
      <Handle
        type="source"
        position={Position.Left}
        className="!bg-blue-500 !w-2 !h-2"
      />
      
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !w-2 !h-2"
      />
    </div>
  );
}

export default memo(CustomNode);

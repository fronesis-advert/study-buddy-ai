"use client";

import { memo } from "react";
import { NodeResizer } from "reactflow";
import type { NodeProps } from "reactflow";

type GroupNodeData = {
  label: string;
  color?: string;
  onEdit?: () => void;
  onDelete?: () => void;
};

function GroupNode({ id, data, selected }: NodeProps<GroupNodeData>) {
  const color = data.color || "#94a3b8";

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        color={color}
      />
      <div
        className="flex h-full w-full flex-col rounded-lg border-2 p-3"
        style={{
          backgroundColor: `${color}20`, // 20% opacity
          borderColor: color,
          borderStyle: "dashed",
        }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-medium"
            style={{ color }}
          >
            {data.label}
          </h3>
          {selected && (data.onEdit || data.onDelete) && (
            <div className="flex items-center gap-1">
              {data.onEdit && (
                <button
                  type="button"
                  onClick={data.onEdit}
                  className="rounded px-2 py-1 text-xs hover:bg-white/50"
                  style={{ color }}
                >
                  Edit
                </button>
              )}
              {data.onDelete && (
                <button
                  type="button"
                  onClick={data.onDelete}
                  className="rounded px-2 py-1 text-xs hover:bg-red-100"
                  style={{ color: "#ef4444" }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default memo(GroupNode);

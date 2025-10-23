"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import type { MindMapNodeData } from "./types";
import {
  Brain,
  Lightbulb,
  FileText,
  StickyNote,
  Edit3,
  Copy,
  Trash2,
  Book,
  AlertCircle,
  TrendingUp,
  Users,
  Star,
  Target,
  Zap,
  Heart,
  Shield,
  Flag,
  Clock,
  Calendar,
  Map,
  Compass,
  Inbox,
  Layers,
  Link,
  Settings,
} from "lucide-react";

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

const iconMap: Record<string, any> = {
  "brain": Brain,
  "book": Book,
  "lightbulb": Lightbulb,
  "alert-circle": AlertCircle,
  "trending-up": TrendingUp,
  "users": Users,
  "star": Star,
  "target": Target,
  "zap": Zap,
  "heart": Heart,
  "shield": Shield,
  "flag": Flag,
  "clock": Clock,
  "calendar": Calendar,
  "map": Map,
  "compass": Compass,
  "inbox": Inbox,
  "layers": Layers,
  "link": Link,
  "settings": Settings,
};

// Calculate node size based on importance (1-5)
function getNodeDimensions(importance: number = 3, nodeType: string) {
  const baseScale = importance / 3; // 1=0.33x, 3=1x, 5=1.67x
  const typeMultipliers = {
    root: 1.5,
    topic: 1.2,
    subtopic: 1.0,
    note: 0.8,
  };
  const multiplier = (typeMultipliers as any)[nodeType] || 1;
  const scale = baseScale * multiplier;
  
  return {
    minWidth: Math.round(120 * scale),
    padding: Math.round(12 * scale),
    iconSize: Math.round(16 * scale),
  };
}

function CustomNode({ data, selected }: NodeProps<MindMapNodeData>) {
  // Use user-selected icon or fallback to node type icon
  const UserIcon = data.icon ? iconMap[data.icon] : null;
  const TypeIcon = nodeTypeIcons[data.nodeType] || Lightbulb;
  const Icon = UserIcon || TypeIcon;
  
  const baseColor = data.color || "#3b82f6";
  const importance = data.importance || 3;
  const dimensions = getNodeDimensions(importance, data.nodeType);
  
  // Importance indicators
  const importanceLevel = importance >= 5 ? "Critical" : importance >= 4 ? "Major" : importance >= 3 ? "Key" : importance >= 2 ? "Supporting" : "Minor";
  const showImportanceBadge = importance >= 4; // Show badge for high importance
  
  return (
    <div
      className={`
        group relative rounded-lg shadow-md transition-all duration-200
        ${selected ? "ring-2 ring-offset-2 ring-blue-500 shadow-lg scale-105" : ""}
        ${nodeTypeStyles[data.nodeType]}
      `}
      style={{
        backgroundColor: baseColor + "20",
        borderColor: baseColor,
        borderWidth: importance >= 4 ? "3px" : "2px",
        borderStyle: "solid",
        minWidth: `${dimensions.minWidth}px`,
        padding: `${dimensions.padding}px`,
      }}
    >
      {(data.onEdit || data.onDuplicate || data.onDelete) && (
        <div className="pointer-events-none absolute -top-3 right-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {data.onEdit && (
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-white/40 bg-white/80 p-1 text-[10px] text-gray-600 shadow"
              onClick={(event) => {
                event.stopPropagation();
                data.onEdit?.();
              }}
              aria-label="Edit node"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
          {data.onDuplicate && (
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-white/40 bg-white/80 p-1 text-[10px] text-gray-600 shadow"
              onClick={(event) => {
                event.stopPropagation();
                data.onDuplicate?.();
              }}
              aria-label="Duplicate node"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
          {data.onDelete && (
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-white/40 bg-white/80 p-1 text-[10px] text-gray-600 shadow hover:text-red-500"
              onClick={(event) => {
                event.stopPropagation();
                data.onDelete?.();
              }}
              aria-label="Delete node"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-2 !h-2"
      />
      
      <div className="flex items-start gap-2">
        <Icon 
          className="flex-shrink-0" 
          size={dimensions.iconSize} 
          style={{ color: baseColor }} 
          strokeWidth={importance >= 4 ? 2.5 : 2}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium text-gray-900 break-words flex-1">
              {data.label}
            </div>
            {showImportanceBadge && (
              <div 
                className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: baseColor, color: 'white' }}
                title={`Importance: ${importanceLevel}`}
              >
                {importance === 5 ? '★' : '●'}
              </div>
            )}
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

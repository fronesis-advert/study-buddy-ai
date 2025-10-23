import type { Node, Edge } from "reactflow";
import type { MindMapRow, MindMapNodeRow, MindMapEdgeRow, MindMapGroupRow } from "@/types/database";

export type MindMapNodeData = {
  label: string;
  content?: string;
  nodeType: "root" | "topic" | "subtopic" | "note";
  color?: string;
  icon?: string;
  importance?: number; // 1 (low) to 5 (critical backbone)
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
};

export type RelationshipType = "causal" | "hierarchical" | "temporal" | "contrast" | "support" | "neutral";

export const relationshipTypeConfig = {
  causal: { label: "Cause → Effect", color: "#ef4444", style: "solid" },
  hierarchical: { label: "Part → Whole", color: "#10b981", style: "solid" },
  temporal: { label: "Before → After", color: "#3b82f6", style: "solid" },
  contrast: { label: "Differs From", color: "#f59e0b", style: "dashed" },
  support: { label: "Supports", color: "#8b5cf6", style: "solid" },
  neutral: { label: "Related To", color: "#6b7280", style: "solid" },
} as const;

export type NodeGroup = {
  id: string;
  mindMapId: string;
  label: string;
  description?: string;
  backgroundColor: string;
  borderColor: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  nodeIds: string[]; // Nodes contained in this group
};

export type AISuggestion = {
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  reason: string;
  connectionType?: string;
};

export type MindMapNode = Node<MindMapNodeData>;
export type MindMapEdge = Edge;

export type MindMap = {
  id: string;
  title: string;
  description?: string;
  isExported: boolean;
  exportedDocumentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type MindMapWithData = MindMap & {
  nodes: MindMapNodeRow[];
  edges: MindMapEdgeRow[];
  groups: MindMapGroupRow[];
};

export type Template = 
  | "blank" 
  | "brainstorm" 
  | "hierarchy" 
  | "studyplan" 
  | "memorization" // Radial structure for recall
  | "process" // Flow structure for understanding
  | "comparison" // Side-by-side for contrasting
  | null;

export const templateDescriptions = {
  blank: "Empty canvas - build from scratch",
  brainstorm: "Central idea with radiating branches",
  hierarchy: "Tree structure for hierarchical knowledge",
  studyplan: "Timeline-based layout",
  memorization: "Radial with grouping for efficient recall",
  process: "Flow diagram for understanding sequences",
  comparison: "Parallel structures for comparing concepts",
} as const;

// Word count validation for learning-focused mind mapping
export function validateNodeLabel(label: string): { valid: boolean; wordCount: number; warning?: string } {
  const words = label.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (wordCount === 0) {
    return { valid: false, wordCount: 0, warning: "Label cannot be empty" };
  }
  
  if (wordCount > 5) {
    return { 
      valid: false, 
      wordCount, 
      warning: `Mind map nodes should be concise (1-3 words). Current: ${wordCount} words. Use the content field for longer descriptions.` 
    };
  }
  
  if (wordCount > 3) {
    return { 
      valid: true, 
      wordCount, 
      warning: `Consider shortening to 1-3 words for better visual memory. Current: ${wordCount} words.` 
    };
  }
  
  return { valid: true, wordCount };
}

// Icon library from Lucide
export const iconOptions = [
  { value: "brain", label: "Brain" },
  { value: "book", label: "Book" },
  { value: "lightbulb", label: "Lightbulb" },
  { value: "alert-circle", label: "Alert" },
  { value: "trending-up", label: "Trending" },
  { value: "users", label: "Users" },
  { value: "star", label: "Star" },
  { value: "target", label: "Target" },
  { value: "zap", label: "Zap" },
  { value: "heart", label: "Heart" },
  { value: "shield", label: "Shield" },
  { value: "flag", label: "Flag" },
  { value: "clock", label: "Clock" },
  { value: "calendar", label: "Calendar" },
  { value: "map", label: "Map" },
  { value: "compass", label: "Compass" },
  { value: "inbox", label: "Inbox" },
  { value: "layers", label: "Layers" },
  { value: "link", label: "Link" },
  { value: "settings", label: "Settings" },
] as const;

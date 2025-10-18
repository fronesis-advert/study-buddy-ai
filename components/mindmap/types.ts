import type { Node, Edge } from "reactflow";
import type { MindMapRow, MindMapNodeRow, MindMapEdgeRow } from "@/types/database";

export type MindMapNodeData = {
  label: string;
  content?: string;
  nodeType: "root" | "topic" | "subtopic" | "note";
  color?: string;
  icon?: string;
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
};

export type Template = "brainstorm" | "hierarchy" | "studyplan" | null;

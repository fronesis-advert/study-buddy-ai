"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import CustomNode from "./custom-node";
import { NodeEditorDialog } from "./node-editor-dialog";
import { MindMapToolbar } from "./mind-map-toolbar";
import type { MindMapNodeData } from "./types";
import type { MindMapNodeRow, MindMapEdgeRow } from "@/types/database";

const nodeTypes = {
  custom: CustomNode,
};

type MindMapCanvasProps = {
  mindMapId: string;
  initialNodes: MindMapNodeRow[];
  initialEdges: MindMapEdgeRow[];
  onSave: (nodes: MindMapNodeRow[], edges: MindMapEdgeRow[]) => Promise<void>;
  onExport: () => void;
  onRequestSuggestions: () => void;
};

export function MindMapCanvas({
  mindMapId,
  initialNodes,
  initialEdges,
  onSave,
  onExport,
  onRequestSuggestions,
}: MindMapCanvasProps) {
  const [nodes, setNodes] = useState<Node<MindMapNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node<MindMapNodeData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Convert database nodes to ReactFlow nodes
  useEffect(() => {
    const flowNodes: Node<MindMapNodeData>[] = initialNodes.map((node) => ({
      id: node.id,
      type: "custom",
      position: { x: node.position_x, y: node.position_y },
      data: {
        label: node.label,
        content: node.content || undefined,
        nodeType: node.node_type,
        color: (node.style as any)?.color || "#3b82f6",
      },
    }));

    const flowEdges: Edge[] = initialEdges.map((edge) => ({
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      label: edge.label || undefined,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: { strokeWidth: 2 },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [initialNodes, initialEdges]);

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const dbNodes: MindMapNodeRow[] = nodes.map((node) => ({
          id: node.id,
          mind_map_id: mindMapId,
          label: node.data.label,
          content: node.data.content || null,
          node_type: node.data.nodeType,
          position_x: node.position.x,
          position_y: node.position.y,
          style: { color: node.data.color },
          created_at: new Date().toISOString(),
        }));

        const dbEdges: MindMapEdgeRow[] = edges.map((edge) => ({
          id: edge.id,
          mind_map_id: mindMapId,
          source_node_id: edge.source,
          target_node_id: edge.target,
          label: typeof edge.label === 'string' ? edge.label : null,
          style: {},
          created_at: new Date().toISOString(),
        }));

        await onSave(dbNodes, dbEdges);
        setLastSaved(new Date());
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce
  }, [nodes, edges, mindMapId, onSave]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: { strokeWidth: 2 },
          },
          eds
        )
      );
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node<MindMapNodeData>) => {
    setEditingNode(node);
    setEditorOpen(true);
  }, []);

  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodes(nodes.map((n) => n.id));
    setSelectedEdges(edges.map((e) => e.id));
  }, []);

  const handleAddNode = () => {
    setEditingNode(null);
    setEditorOpen(true);
  };

  const handleSaveNode = (data: MindMapNodeData) => {
    if (editingNode) {
      // Update existing node
      setNodes((nds) =>
        nds.map((node) =>
          node.id === editingNode.id
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
    } else {
      // Create new node
      const newNode: Node<MindMapNodeData> = {
        id: `node_${Date.now()}`,
        type: "custom",
        position: {
          x: Math.random() * 400,
          y: Math.random() * 400,
        },
        data,
      };
      setNodes((nds) => [...nds, newNode]);
    }
    triggerAutoSave();
  };

  const handleDeleteSelected = () => {
    if (selectedNodes.length > 0) {
      setNodes((nds) => nds.filter((node) => !selectedNodes.includes(node.id)));
    }
    if (selectedEdges.length > 0) {
      setEdges((eds) => eds.filter((edge) => !selectedEdges.includes(edge.id)));
    }
    setSelectedNodes([]);
    setSelectedEdges([]);
    triggerAutoSave();
  };

  const handleFitView = () => {
    fitView({ padding: 0.2, duration: 300 });
  };

  const handleZoomIn = () => {
    zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 300 });
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <MindMapToolbar
        onAddNode={handleAddNode}
        onDeleteSelected={handleDeleteSelected}
        onExport={onExport}
        onSuggestConnections={onRequestSuggestions}
        hasSelection={selectedNodes.length > 0 || selectedEdges.length > 0}
        isSaving={isSaving}
        lastSaved={lastSaved}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
      />

      <div className="flex-1 rounded-lg border bg-white shadow-sm overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
        </ReactFlow>
      </div>

      <NodeEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveNode}
        initialData={editingNode?.data}
      />
    </div>
  );
}

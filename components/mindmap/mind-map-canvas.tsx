"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
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
import type { MindMapNodeData, RelationshipType } from "./types";
import { relationshipTypeConfig, iconOptions } from "./types";
import { Brain, Book, Lightbulb, AlertCircle, TrendingUp, Users, Star, Target, Zap, Heart, Shield, Flag, Clock, Calendar, Map, Compass, Inbox, Layers, Link, Settings } from "lucide-react";
import type { MindMapNodeRow, MindMapEdgeRow } from "@/types/database";
import { v4 as uuid } from "uuid";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const nodeTypes = {
  custom: CustomNode,
};

const nodeColors = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Green", value: "#10b981" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Indigo", value: "#6366f1" },
];

type MindMapCanvasProps = {
  mindMapId: string;
  initialNodes: MindMapNodeRow[];
  initialEdges: MindMapEdgeRow[];
  onSave: (nodes: MindMapNodeRow[], edges: MindMapEdgeRow[]) => Promise<void>;
  onExport: () => void;
  onRequestSuggestions: () => void;
  suggestionsLoading?: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type FlowSnapshot = {
  nodes: Node<MindMapNodeData>[];
  edges: Edge[];
};

export function MindMapCanvas({
  mindMapId,
  initialNodes,
  initialEdges,
  onSave,
  onExport,
  onRequestSuggestions,
  suggestionsLoading = false,
}: MindMapCanvasProps) {
  const [nodes, setNodes] = useState<Node<MindMapNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node<MindMapNodeData> | null>(null);
  const [edgeEditorOpen, setEdgeEditorOpen] = useState(false);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [edgeLabel, setEdgeLabel] = useState("");
  const [edgeRelationship, setEdgeRelationship] = useState<RelationshipType>("neutral");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>();
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [undoStack, setUndoStack] = useState<FlowSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<FlowSnapshot[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const quickEditHistoryRef = useRef<Set<string>>(new Set());
  const nodesRef = useRef<Node<MindMapNodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
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
        nodeType: (node.node_type ?? "topic") as MindMapNodeData["nodeType"],
        color: (node.style as any)?.color || "#3b82f6",
        importance: (node as any).importance || 3,
        icon: (node as any).icon || undefined,
      },
    }));

    const flowEdges: Edge[] = initialEdges
      .filter((edge) => edge.source_node_id && edge.target_node_id)
      .map((edge) => {
        const relationshipType = ((edge as any).relationship_type || "neutral") as RelationshipType;
        const config = relationshipTypeConfig[relationshipType];
        
        return {
          id: edge.id,
          source: edge.source_node_id!,
          target: edge.target_node_id!,
          label: edge.label || undefined,
          data: { relationshipType }, // Store for editing
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: config.color,
          },
          style: { 
            strokeWidth: 2,
            stroke: config.color,
            strokeDasharray: config.style === "dashed" ? "5,5" : undefined,
          },
        };
      });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [initialNodes, initialEdges]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    quickEditHistoryRef.current.clear();
  }, [activeNodeId]);

  const createSnapshot = useCallback((): FlowSnapshot => {
    return {
      nodes: nodesRef.current.map((node) => ({
        ...node,
        position: { ...node.position },
        data: { ...node.data },
      })),
      edges: edgesRef.current.map((edge) => ({
        ...edge,
        data: edge.data ? { ...edge.data } : undefined,
      })),
    };
  }, []);

  const pushUndoState = useCallback(() => {
    setUndoStack((prev) => {
      const next = [...prev, createSnapshot()];
      // Keep history reasonable (last 30 changes)
      if (next.length > 30) {
        next.shift();
      }
      return next;
    });
    setRedoStack([]);
  }, [createSnapshot]);

  const recordQuickEditHistory = useCallback((nodeId: string, field: string) => {
    const key = `${nodeId}:${field}`;
    if (!quickEditHistoryRef.current.has(key)) {
      pushUndoState();
      quickEditHistoryRef.current.add(key);
    }
  }, [pushUndoState]);

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      setSaveStatus("saving");
      try {
        const dbNodes: MindMapNodeRow[] = nodes.map((node) => ({
          id: node.id,
          mind_map_id: mindMapId,
          label: node.data.label,
          content: node.data.content || null,
          node_type: node.data.nodeType,
          importance: node.data.importance || 3,
          icon: node.data.icon || null,
          position_x: node.position.x,
          position_y: node.position.y,
          style: { color: node.data.color },
          created_at: new Date().toISOString(),
        } as any));

        const dbEdges: MindMapEdgeRow[] = edges.map((edge) => ({
          id: edge.id,
          mind_map_id: mindMapId,
          source_node_id: edge.source,
          target_node_id: edge.target,
          label: typeof edge.label === 'string' ? edge.label : null,
          relationship_type: (edge.data as any)?.relationshipType || "neutral",
          style: {},
          created_at: new Date().toISOString(),
        } as any));

        await onSave(dbNodes, dbEdges);
        setLastSaved(new Date());
        setSaveStatus("saved");
      } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus("error");
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce
  }, [nodes, edges, mindMapId, onSave]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (changes.some((change) => change.type === "position" && change.dragging === false)) {
        pushUndoState();
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
      triggerAutoSave();
    },
    [pushUndoState, triggerAutoSave]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((change) => change.type === "remove")) {
        pushUndoState();
      }
      setEdges((eds) => applyEdgeChanges(changes, eds));
      triggerAutoSave();
    },
    [pushUndoState, triggerAutoSave]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      pushUndoState();
      const defaultRelationship: RelationshipType = "neutral";
      const config = relationshipTypeConfig[defaultRelationship];
      
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: uuid(),
            data: { relationshipType: defaultRelationship },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: config.color,
            },
            style: { 
              strokeWidth: 2,
              stroke: config.color,
            },
          },
          eds
        )
      );
      triggerAutoSave();
    },
    [pushUndoState, triggerAutoSave]
  );

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node<MindMapNodeData>) => {
    setEditingNode(node);
    setEditorOpen(true);
  }, []);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setEditingEdge(edge);
    setEdgeLabel(typeof edge.label === 'string' ? edge.label : "");
    setEdgeRelationship((edge.data as any)?.relationshipType || "neutral");
    setEdgeEditorOpen(true);
  }, []);

  const handleSaveEdge = useCallback(() => {
    if (!editingEdge) return;
    
    pushUndoState();
    const config = relationshipTypeConfig[edgeRelationship];
    
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === editingEdge.id
          ? {
              ...edge,
              label: edgeLabel || undefined,
              data: { relationshipType: edgeRelationship },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: config.color,
              },
              style: {
                strokeWidth: 2,
                stroke: config.color,
                strokeDasharray: config.style === "dashed" ? "5,5" : undefined,
              },
            }
          : edge
      )
    );
    
    setEdgeEditorOpen(false);
    setEditingEdge(null);
    triggerAutoSave();
  }, [editingEdge, edgeLabel, edgeRelationship, pushUndoState, triggerAutoSave]);

  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodes(nodes.map((n) => n.id));
    setSelectedEdges(edges.map((e) => e.id));
    setActiveNodeId(nodes.length > 0 ? nodes[0].id : null);
  }, []);

  const handleAddNode = () => {
    setEditingNode(null);
    setEditorOpen(true);
  };

  const handleSaveNode = (data: MindMapNodeData) => {
    pushUndoState();
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
        id: uuid(),
        type: "custom",
        position: {
          x: Math.random() * 400,
          y: Math.random() * 400,
        },
        data,
      };
      setNodes((nds) => [...nds, newNode]);
      setActiveNodeId(newNode.id);
      setSelectedNodes([newNode.id]);
      setSelectedEdges([]);
    }
    triggerAutoSave();
  };

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const original = nodesRef.current.find((node) => node.id === nodeId);
      if (!original) {
        return;
      }
      pushUndoState();
      const newNode: Node<MindMapNodeData> = {
        ...original,
        id: uuid(),
        position: {
          x: original.position.x + 40,
          y: original.position.y + 40,
        },
        data: {
          ...original.data,
          label: `${original.data.label} (copy)`,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setActiveNodeId(newNode.id);
      setSelectedNodes([newNode.id]);
      setSelectedEdges([]);
      triggerAutoSave();
    },
    [pushUndoState, triggerAutoSave]
  );

  const handleDeleteNode = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;
      pushUndoState();
      setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !nodeIds.includes(edge.source) &&
            !nodeIds.includes(edge.target)
        )
      );
      setSelectedNodes([]);
      setSelectedEdges([]);
      if (nodeIds.includes(activeNodeId ?? "")) {
        setActiveNodeId(null);
      }
      triggerAutoSave();
    },
    [activeNodeId, pushUndoState, triggerAutoSave]
  );

  const handleDeleteSelected = () => {
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
    pushUndoState();
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

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      setRedoStack((redoPrev) => [...redoPrev, createSnapshot()]);
      setNodes(snapshot.nodes.map((node) => ({ ...node, data: { ...node.data } })));
      setEdges(snapshot.edges.map((edge) => ({ ...edge })));
      setSelectedNodes([]);
      setSelectedEdges([]);
      setActiveNodeId(null);
      setTimeout(() => triggerAutoSave(), 0);
      return prev.slice(0, -1);
    });
  }, [createSnapshot, triggerAutoSave]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      setUndoStack((undoPrev) => [...undoPrev, createSnapshot()]);
      setNodes(snapshot.nodes.map((node) => ({ ...node, data: { ...node.data } })));
      setEdges(snapshot.edges.map((edge) => ({ ...edge })));
      setSelectedNodes([]);
      setSelectedEdges([]);
      setActiveNodeId(null);
      setTimeout(() => triggerAutoSave(), 0);
      return prev.slice(0, -1);
    });
  }, [createSnapshot, triggerAutoSave]);

  // Detect island nodes (nodes with no connections)
  const islandNodes = useMemo(() => {
    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    return nodes.filter((node) => !connectedNodeIds.has(node.id));
  }, [nodes, edges]);

  const decoratedNodes = useMemo(() => {
    return nodes.map((node) => {
      const isIsland = islandNodes.some((n) => n.id === node.id);
      return {
        ...node,
        className: isIsland ? "animate-pulse" : "",
        style: {
          ...node.style,
          opacity: isIsland ? 0.7 : 1,
        },
        data: {
          ...node.data,
          onEdit: () => {
            setEditingNode(node);
            setEditorOpen(true);
          },
          onDuplicate: () => handleDuplicateNode(node.id),
          onDelete: () => handleDeleteNode([node.id]),
        },
      };
    });
  }, [handleDeleteNode, handleDuplicateNode, nodes, islandNodes]);

  const activeNode =
    nodes.find((node) => node.id === (selectedNodes[0] ?? activeNodeId ?? "")) ||
    null;

  return (
    <div className={cn(
      "flex gap-3 h-full",
      isFullscreen && "fixed inset-0 z-50 bg-background p-4"
    )}>
      <div className="flex flex-col gap-3 flex-1">
        <MindMapToolbar
          onAddNode={handleAddNode}
          onDeleteSelected={handleDeleteSelected}
          onExport={onExport}
          onSuggestConnections={onRequestSuggestions}
          isSuggesting={suggestionsLoading}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          hasSelection={selectedNodes.length > 0 || selectedEdges.length > 0}
          isSaving={isSaving}
          saveStatus={saveStatus}
          lastSaved={lastSaved}
          nodeCount={nodes.length}
          edgeCount={edges.length}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          islandNodes={islandNodes.length}
          onToggleFullscreen={handleToggleFullscreen}
          isFullscreen={isFullscreen}
        />

        <div className="flex-1 rounded-lg border bg-white shadow-sm overflow-hidden">
          <ReactFlow
          nodes={decoratedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
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

        {/* Edge Editor Dialog */}
        <Dialog open={edgeEditorOpen} onOpenChange={setEdgeEditorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Connection</DialogTitle>
              <DialogDescription>
                Define the relationship type and label for this connection.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edge-relationship">Relationship Type *</Label>
                <Select value={edgeRelationship} onValueChange={(v) => setEdgeRelationship(v as RelationshipType)}>
                  <SelectTrigger id="edge-relationship">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(relationshipTypeConfig).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-8 rounded"
                            style={{
                              backgroundColor: config.color,
                              borderStyle: config.style === "dashed" ? "dashed" : "solid",
                              borderWidth: "2px",
                              borderColor: config.color,
                            }}
                          />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the type of relationship to visually encode meaning
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edge-label">Label (Optional)</Label>
                <Input
                  id="edge-label"
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  placeholder="e.g., depends on, leads to..."
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Add a short description of this connection
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEdgeEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdge}>
                Save Connection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick edit sidebar - hidden in fullscreen */}
      {!isFullscreen && (
        <Card className="w-[280px] flex-shrink-0 border border-primary/10 bg-card/60 shadow-sm">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Quick Edit
              </h3>
              <p className="text-xs text-muted-foreground">
                Select a node to edit its details instantly.
              </p>
            </div>

            {activeNode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={activeNode.data.label}
                    onChange={(event) => {
                      const value = event.target.value;
                      recordQuickEditHistory(activeNode.id, "label");
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === activeNode.id
                            ? { ...node, data: { ...node.data, label: value } }
                            : node
                        )
                      );
                      triggerAutoSave();
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={activeNode.data.nodeType}
                    onValueChange={(value) => {
                      recordQuickEditHistory(activeNode.id, "type");
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === activeNode.id
                            ? {
                                ...node,
                                data: { ...node.data, nodeType: value as MindMapNodeData["nodeType"] },
                              }
                            : node
                        )
                      );
                      triggerAutoSave();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Root (Main topic)</SelectItem>
                      <SelectItem value="topic">Topic</SelectItem>
                      <SelectItem value="subtopic">Subtopic</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select
                    value={activeNode.data.icon || "none"}
                    onValueChange={(value) => {
                      recordQuickEditHistory(activeNode.id, "icon");
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === activeNode.id
                            ? {
                                ...node,
                                data: { ...node.data, icon: value === "none" ? undefined : value },
                              }
                            : node
                        )
                      );
                      triggerAutoSave();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No icon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Icon</SelectItem>
                      {iconOptions.map((opt) => {
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
                        const IconComponent = iconMap[opt.value];
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              {IconComponent && <IconComponent className="h-4 w-4" />}
                              {opt.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Importance</Label>
                    <span className="text-xs font-medium text-primary">
                      {activeNode.data.importance || 3}/5
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[activeNode.data.importance || 3]}
                    onValueChange={(values: number[]) => {
                      recordQuickEditHistory(activeNode.id, "importance");
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === activeNode.id
                            ? {
                                ...node,
                                data: { ...node.data, importance: values[0] },
                              }
                            : node
                        )
                      );
                      triggerAutoSave();
                    }}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Minor</span>
                    <span>Key</span>
                    <span>Critical</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {nodeColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => {
                          recordQuickEditHistory(activeNode.id, "color");
                          setNodes((nds) =>
                            nds.map((node) =>
                              node.id === activeNode.id
                                ? {
                                    ...node,
                                    data: { ...node.data, color: color.value },
                                  }
                                : node
                            )
                          );
                          triggerAutoSave();
                        }}
                        className={cn(
                          "h-8 w-full rounded-md border transition hover:scale-105",
                          activeNode.data.color === color.value
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        aria-label={`Use ${color.name}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={activeNode.data.content ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      recordQuickEditHistory(activeNode.id, "content");
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === activeNode.id
                            ? {
                                ...node,
                                data: { ...node.data, content: value || undefined },
                              }
                            : node
                        )
                      );
                      triggerAutoSave();
                    }}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Markdown is supported.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateNode(activeNode.id)}
                  >
                    Duplicate node
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteNode([activeNode.id])}
                  >
                    Delete node
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
                <p>Select a node to start editing.</p>
                <p>Tip: double-click a node for the full editor.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
      )}
    </div>
  );
}





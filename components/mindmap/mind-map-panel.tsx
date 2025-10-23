"use client";

import { useState, useEffect } from "react";
import { ReactFlowProvider } from "reactflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Sparkles, FileText, ArrowLeft } from "lucide-react";
import { MindMapCanvas } from "./mind-map-canvas";
import type { MindMapNodeRow, MindMapEdgeRow, MindMapGroupRow } from "@/types/database";
import type { DocumentSummary } from "@/components/documents/document-manager";
import type { Template } from "./types";
import { templateDescriptions } from "./types";

type MindMapSummary = {
  id: string;
  title: string;
  description: string | null;
  isExported: boolean;
  updatedAt: string;
};

type MindMapPanelProps = {
  documents: DocumentSummary[];
};

type AISuggestion = {
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  reason: string;
  connectionType?: string;
};

export function MindMapPanel({ documents }: MindMapPanelProps) {
  const [mindMaps, setMindMaps] = useState<MindMapSummary[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [mapData, setMapData] = useState<{
    nodes: MindMapNodeRow[];
    edges: MindMapEdgeRow[];
    groups: MindMapGroupRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState("");
  const [newMapDescription, setNewMapDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [suggestionsMessage, setSuggestionsMessage] = useState<string | null>(null);
  const [conceptSuggestions, setConceptSuggestions] = useState<any[]>([]);
  const [conceptDialogOpen, setConceptDialogOpen] = useState(false);
  const [suggestedMapTitle, setSuggestedMapTitle] = useState("");

  // Fetch mind maps list
  useEffect(() => {
    fetchMindMaps();
  }, []);

  // Fetch specific mind map data when selected
  useEffect(() => {
    if (selectedMapId) {
      fetchMindMapData(selectedMapId);
    }
  }, [selectedMapId]);

  useEffect(() => {
    setSuggestionsDialogOpen(false);
    setSuggestions([]);
    setSuggestionsMessage(null);
  }, [selectedMapId]);

  const fetchMindMaps = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mindmaps");
      if (!response.ok) throw new Error("Failed to fetch mind maps");

      const data = await response.json();
      setMindMaps(
        data.mindMaps.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          isExported: m.is_exported,
          updatedAt: m.updated_at,
        }))
      );
    } catch (err) {
      console.error("Error fetching mind maps:", err);
      setError("Failed to load mind maps");
    } finally {
      setLoading(false);
    }
  };

  const fetchMindMapData = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch mind map data (nodes and edges)
      const response = await fetch(`/api/mindmaps/${id}`);
      if (!response.ok) throw new Error("Failed to fetch mind map data");
      const data = await response.json();

      // Fetch groups
      const groupsResponse = await fetch(`/api/mindmaps/${id}/groups`);
      let groups: MindMapGroupRow[] = [];
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        groups = groupsData.groups || [];
      }

      setMapData({
        nodes: data.nodes,
        edges: data.edges,
        groups,
      });
    } catch (err) {
      console.error("Error fetching mind map data:", err);
      setError("Failed to load mind map");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMindMap = async () => {
    if (!newMapTitle.trim()) return;

    try {
      const response = await fetch("/api/mindmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newMapTitle,
          description: newMapDescription || undefined,
          template: selectedTemplate,
        }),
      });

      if (!response.ok) throw new Error("Failed to create mind map");

      const data = await response.json();
      await fetchMindMaps();
      setSelectedMapId(data.mindMap.id);
      setCreateDialogOpen(false);
      setNewMapTitle("");
      setNewMapDescription("");
      setSelectedTemplate(null);
    } catch (err) {
      console.error("Error creating mind map:", err);
      setError("Failed to create mind map");
    }
  };

  const handleGenerateFromDocument = async () => {
    if (!selectedDocId) return;

    try {
      setGenerateDialogOpen(false);
      setLoading(true);

      const response = await fetch("/api/mindmaps/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDocId,
          mode: "suggest", // AI-assisted mode
        }),
      });

      if (!response.ok) throw new Error("Failed to analyze document");

      const data = await response.json();
      
      if (data.mode === "suggest") {
        // Show concept suggestions for manual creation
        setConceptSuggestions(data.concepts || []);
        setSuggestedMapTitle(data.title);
        setConceptDialogOpen(true);
        setSelectedDocId("");
      } else {
        // Legacy auto-creation mode
        await fetchMindMaps();
        setSelectedMapId(data.mindMapId);
        setSelectedDocId("");
      }
    } catch (err) {
      console.error("Error analyzing document:", err);
      setError("Failed to analyze document");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMapFromConcepts = async () => {
    if (!suggestedMapTitle.trim()) return;
    
    try {
      // Create empty mind map first
      const response = await fetch("/api/mindmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestedMapTitle,
          description: `AI-assisted mind map with ${conceptSuggestions.length} suggested concepts`,
        }),
      });

      if (!response.ok) throw new Error("Failed to create mind map");

      const data = await response.json();
      await fetchMindMaps();
      setSelectedMapId(data.mindMap.id);
      setConceptDialogOpen(false);
      setConceptSuggestions([]);
    } catch (err) {
      console.error("Error creating mind map:", err);
      setError("Failed to create mind map");
    }
  };

  const handleSaveMindMap = async (nodes: MindMapNodeRow[], edges: MindMapEdgeRow[]) => {
    if (!selectedMapId) return;

    try {
      const response = await fetch(`/api/mindmaps/${selectedMapId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });

      if (!response.ok) throw new Error("Failed to save mind map");
    } catch (err) {
      console.error("Error saving mind map:", err);
      throw err;
    }
  };

  const handleExportToDocuments = async () => {
    if (!selectedMapId) return;

    try {
      const response = await fetch(`/api/mindmaps/${selectedMapId}/export`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to export mind map");

      const data = await response.json();
      alert(data.message || "Mind map exported to documents!");
      await fetchMindMaps();
    } catch (err) {
      console.error("Error exporting mind map:", err);
      setError("Failed to export mind map");
    }
  };

  const handleRequestSuggestions = async () => {
    if (!selectedMapId) return;

    setSuggestionsLoading(true);
    setSuggestions([]);
    setSuggestionsMessage(null);

    try {
      const response = await fetch("/api/mindmaps/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mindMapId: selectedMapId }),
      });

      if (!response.ok) throw new Error("Failed to get suggestions");

      const data = await response.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setSuggestionsDialogOpen(true);
      } else {
        setSuggestionsMessage("No new connection suggestions at this time.");
        setSuggestionsDialogOpen(true);
      }
    } catch (err) {
      console.error("Error getting suggestions:", err);
      setSuggestions([]);
      setSuggestionsMessage(
        "We couldn't generate suggestions right now. Please try again later."
      );
      setSuggestionsDialogOpen(true);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleDeleteMindMap = async (id: string) => {
    if (!confirm("Are you sure you want to delete this mind map?")) return;

    try {
      const response = await fetch(`/api/mindmaps?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete mind map");

      if (selectedMapId === id) {
        setSelectedMapId(null);
        setMapData(null);
      }
      await fetchMindMaps();
    } catch (err) {
      console.error("Error deleting mind map:", err);
      setError("Failed to delete mind map");
    }
  };

  // If a mind map is selected, show the canvas
  if (selectedMapId && mapData) {
    return (
      <div className="flex flex-col gap-3 h-[calc(100vh-250px)]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMapId(null);
              setMapData(null);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Mind Maps
          </Button>
        </div>

        <ReactFlowProvider>
          <MindMapCanvas
            mindMapId={selectedMapId}
            initialNodes={mapData.nodes}
            initialEdges={mapData.edges}
            initialGroups={mapData.groups}
            onSave={handleSaveMindMap}
            onExport={handleExportToDocuments}
            onRequestSuggestions={handleRequestSuggestions}
            suggestionsLoading={suggestionsLoading}
          />
        </ReactFlowProvider>

        <Dialog
          open={suggestionsDialogOpen}
          onOpenChange={(open) => {
            setSuggestionsDialogOpen(open);
            if (!open) {
              setSuggestions([]);
              setSuggestionsMessage(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Suggestions
              </DialogTitle>
              <DialogDescription>
                Explore potential connections to enrich this mind map.
              </DialogDescription>
            </DialogHeader>

            {suggestionsMessage ? (
              <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                {suggestionsMessage}
              </div>
            ) : (
              <ScrollArea className="max-h-[50vh] pr-2">
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <div
                      key={`${suggestion.sourceId}-${suggestion.targetId}`}
                      className="rounded-lg border bg-background p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
                          {suggestion.sourceLabel}
                        </span>
                        <Badge variant="outline" className="uppercase text-[10px] tracking-wide">
                          {suggestion.connectionType ?? "relates to"}
                        </Badge>
                        <span className="rounded-md bg-secondary/20 px-2 py-1">
                          {suggestion.targetLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {suggestion.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {!suggestionsMessage && suggestions.length > 0 && (
              <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                Tip: Use the connection tool to add links between these nodes.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Otherwise, show the mind maps list
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <Button
            variant="link"
            className="ml-2 p-0 text-destructive underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Mind Maps</h2>
          <p className="text-sm text-muted-foreground">
            Create visual mind maps to organize your learning
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={documents.length === 0}>
                <Sparkles className="h-4 w-4 mr-1" />
                AI Assist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI-Assisted Concept Extraction</DialogTitle>
                <DialogDescription>
                  AI will analyze your document and suggest key concepts. You'll manually create nodes for active learning.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Document</Label>
                  <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a document" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setGenerateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleGenerateFromDocument} disabled={!selectedDocId}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze & Suggest
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                New Mind Map
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Mind Map</DialogTitle>
                <DialogDescription>
                  Start from scratch or use a template to get started quickly.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newMapTitle}
                    onChange={(e) => setNewMapTitle(e.target.value)}
                    placeholder="e.g., Biology Chapter 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newMapDescription}
                    onChange={(e) => setNewMapDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Template (Optional)</Label>
                  <Select
                    value={selectedTemplate || "none"}
                    onValueChange={(value) =>
                      setSelectedTemplate(value === "none" ? null : (value as Template))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Blank Canvas</SelectItem>
                      {Object.entries(templateDescriptions).map(([key, desc]) => (
                        <SelectItem key={key} value={key}>
                          {desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose a template based on your learning goal
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMindMap} disabled={!newMapTitle.trim()}>
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Concept Suggestions Dialog - AI-Assisted Mode */}
          <Dialog open={conceptDialogOpen} onOpenChange={setConceptDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Suggested Concepts
                </DialogTitle>
                <DialogDescription>
                  AI has analyzed your document and extracted key concepts. Review these suggestions and manually create nodes to engage in active learning.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold mb-2">📚 Learning Approach</h3>
                  <p className="text-xs text-muted-foreground">
                    You'll create an empty mind map, then manually add nodes based on these suggestions.
                    This active process helps you think critically about concepts and their relationships.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Suggested Title</label>
                  <input
                    type="text"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={suggestedMapTitle}
                    onChange={(e) => setSuggestedMapTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    {conceptSuggestions.length} Concept Suggestions
                  </label>
                  <ScrollArea className="h-[300px] rounded-md border p-4">
                    <div className="space-y-3">
                      {conceptSuggestions.map((concept, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border bg-background p-3 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                              {concept.importance}/5
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{concept.label}</div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {concept.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  Type: {concept.suggestedType}
                                </span>
                                {concept.suggestedIcon && (
                                  <span className="text-xs text-muted-foreground">
                                    • Icon: {concept.suggestedIcon}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Next Steps:</h4>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Click "Create Empty Mind Map" below</li>
                    <li>Use the suggestions above to manually add nodes</li>
                    <li>Think about relationships as you connect concepts</li>
                    <li>Keep labels brief (1-3 words)</li>
                    <li>Rate importance to create visual hierarchy</li>
                  </ol>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConceptDialogOpen(false);
                    setConceptSuggestions([]);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateMapFromConcepts}>
                  Create Empty Mind Map
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="h-[500px] rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading mind maps...</p>
          ) : mindMaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No mind maps yet. Create one to get started!
              </p>
            </div>
          ) : (
            mindMaps.map((map) => (
              <div
                key={map.id}
                className="flex items-start justify-between gap-2 rounded-md bg-background p-4 shadow-sm border hover:border-primary cursor-pointer transition-colors"
                onClick={() => setSelectedMapId(map.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{map.title}</h3>
                    {map.isExported && (
                      <Badge variant="secondary" className="text-xs">
                        Exported
                      </Badge>
                    )}
                  </div>
                  {map.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {map.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {new Date(map.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMindMap(map.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

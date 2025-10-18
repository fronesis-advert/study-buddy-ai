"use client";

import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Download,
  Save,
  Sparkles,
  Link2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type ToolbarProps = {
  onAddNode: () => void;
  onDeleteSelected: () => void;
  onExport: () => void;
  onSuggestConnections: () => void;
  hasSelection: boolean;
  isSaving: boolean;
  lastSaved?: Date;
  nodeCount: number;
  edgeCount: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
};

export function MindMapToolbar({
  onAddNode,
  onDeleteSelected,
  onExport,
  onSuggestConnections,
  hasSelection,
  isSaving,
  lastSaved,
  nodeCount,
  edgeCount,
  onZoomIn,
  onZoomOut,
  onFitView,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 shadow-sm">
      {/* Left side - Edit actions */}
      <div className="flex items-center gap-2">
        <Button onClick={onAddNode} size="sm" variant="default">
          <Plus className="h-4 w-4 mr-1" />
          Add Node
        </Button>

        <Button
          onClick={onDeleteSelected}
          size="sm"
          variant="destructive"
          disabled={!hasSelection}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button onClick={onSuggestConnections} size="sm" variant="secondary">
          <Sparkles className="h-4 w-4 mr-1" />
          AI Suggest
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button onClick={onZoomIn} size="sm" variant="ghost">
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button onClick={onZoomOut} size="sm" variant="ghost">
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button onClick={onFitView} size="sm" variant="ghost">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Center - Stats */}
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {nodeCount} node{nodeCount !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline">
          {edgeCount} connection{edgeCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Right side - Save & Export */}
      <div className="flex items-center gap-2">
        {isSaving ? (
          <span className="text-sm text-muted-foreground">Saving...</span>
        ) : lastSaved ? (
          <span className="text-sm text-muted-foreground">
            Saved {formatTimeAgo(lastSaved)}
          </span>
        ) : null}

        <Button onClick={onExport} size="sm" variant="outline">
          <Download className="h-4 w-4 mr-1" />
          Export to Docs
        </Button>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString();
}

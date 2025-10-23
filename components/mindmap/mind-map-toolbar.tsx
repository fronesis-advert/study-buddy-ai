"use client";

import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Download,
  Sparkles,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Loader2,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ToolbarProps = {
  onAddNode: () => void;
  onDeleteSelected: () => void;
  onExport: () => void;
  onSuggestConnections: () => void;
  isSuggesting: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  isSaving: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  lastSaved?: Date;
  nodeCount: number;
  edgeCount: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  islandNodes?: number;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
};

export function MindMapToolbar({
  onAddNode,
  onDeleteSelected,
  onExport,
  onSuggestConnections,
  isSuggesting,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasSelection,
  isSaving,
  saveStatus,
  lastSaved,
  nodeCount,
  edgeCount,
  onZoomIn,
  onZoomOut,
  onFitView,
  islandNodes = 0,
  onToggleFullscreen,
  isFullscreen = false,
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

        <Button
          onClick={onSuggestConnections}
          size="sm"
          variant="secondary"
          disabled={isSuggesting}
        >
          {isSuggesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1" />
              AI Suggest
            </>
          )}
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

        {onToggleFullscreen && (
          <Button 
            onClick={onToggleFullscreen} 
            size="sm" 
            variant="ghost"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}

        <Separator orientation="vertical" className="h-6" />

        <Button
          onClick={onUndo}
          size="sm"
          variant="ghost"
          disabled={!canUndo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          onClick={onRedo}
          size="sm"
          variant="ghost"
          disabled={!canRedo}
        >
          <Redo2 className="h-4 w-4" />
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
        {islandNodes > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {islandNodes} isolated
          </Badge>
        )}
      </div>

      {/* Right side - Save & Export */}
      <div className="flex items-center gap-2">
        {isSaving ? (
          <span className="text-sm text-muted-foreground">Saving...</span>
        ) : lastSaved ? (
          <span
            className={cn(
              "flex items-center gap-1 text-sm",
              saveStatus === "error"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {saveStatus === "error" ? (
              "Autosave failed. Retry soon."
            ) : (
              <>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                Saved {formatTimeAgo(lastSaved)}
              </>
            )}
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

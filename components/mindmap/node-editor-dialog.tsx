"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import type { MindMapNodeData } from "./types";

type NodeEditorDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: MindMapNodeData) => void;
  initialData?: MindMapNodeData;
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

export function NodeEditorDialog({
  open,
  onClose,
  onSave,
  initialData,
}: NodeEditorDialogProps) {
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [nodeType, setNodeType] = useState<"root" | "topic" | "subtopic" | "note">("topic");
  const [color, setColor] = useState("#3b82f6");

  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label);
      setContent(initialData.content || "");
      setNodeType(initialData.nodeType);
      setColor(initialData.color || "#3b82f6");
    } else {
      // Reset for new node
      setLabel("");
      setContent("");
      setNodeType("topic");
      setColor("#3b82f6");
    }
  }, [initialData, open]);

  const handleSave = () => {
    if (!label.trim()) return;

    onSave({
      label: label.trim(),
      content: content.trim() || undefined,
      nodeType,
      color,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Node" : "Create New Node"}
          </DialogTitle>
          <DialogDescription>
            Add a label and optional markdown content for this node.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="node-label">Label *</Label>
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Key Concept"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="node-type">Node Type</Label>
              <Select
                value={nodeType}
                onValueChange={(value: any) => setNodeType(value)}
              >
                <SelectTrigger id="node-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root (Main Topic)</SelectItem>
                  <SelectItem value="topic">Topic</SelectItem>
                  <SelectItem value="subtopic">Subtopic</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-color">Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger id="node-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {nodeColors.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-content">
              Content (Markdown supported)
            </Label>
            <Textarea
              id="node-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add detailed notes, explanations, or key points here...&#10;&#10;You can use **bold**, *italic*, `code`, lists, etc."
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use markdown formatting for better organization
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            {initialData ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

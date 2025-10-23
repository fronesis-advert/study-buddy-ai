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
import { validateNodeLabel, iconOptions } from "./types";
import { AlertCircle, Brain, Book, Lightbulb, TrendingUp, Users, Star, Target, Zap, Heart, Shield, Flag, Clock, Calendar, Map, Compass, Inbox, Layers, Link, Settings } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [importance, setImportance] = useState(3);
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [labelValidation, setLabelValidation] = useState<ReturnType<typeof validateNodeLabel>>(validateNodeLabel(""));

  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label);
      setContent(initialData.content || "");
      setNodeType(initialData.nodeType);
      setColor(initialData.color || "#3b82f6");
      setImportance(initialData.importance || 3);
      setIcon(initialData.icon);
      setLabelValidation(validateNodeLabel(initialData.label));
    } else {
      // Reset for new node
      setLabel("");
      setContent("");
      setNodeType("topic");
      setColor("#3b82f6");
      setImportance(3);
      setIcon(undefined);
      setLabelValidation(validateNodeLabel(""));
    }
  }, [initialData, open]);

  useEffect(() => {
    setLabelValidation(validateNodeLabel(label));
  }, [label]);

  const handleSave = () => {
    if (!label.trim() || !labelValidation.valid) return;

    onSave({
      label: label.trim(),
      content: content.trim() || undefined,
      nodeType,
      color,
      importance,
      icon,
    });

    onClose();
  };

  const getIconComponent = (iconName?: string) => {
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
    return iconName ? iconMap[iconName] : null;
  };

  const importanceLabels = [
    "Minor detail",
    "Supporting point",
    "Key concept",
    "Major idea",
    "Critical backbone"
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Node" : "Create New Node"}
          </DialogTitle>
          <DialogDescription>
            Create concise labels (1-3 words) for better visual memory. Use content for detailed notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="node-label">Label *</Label>
              <span className="text-xs text-muted-foreground">
                {labelValidation.wordCount} {labelValidation.wordCount === 1 ? 'word' : 'words'}
              </span>
            </div>
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Brief label (1-3 words)"
              maxLength={50}
              className={!labelValidation.valid && label ? "border-destructive" : ""}
            />
            {labelValidation.warning && label && (
              <Alert variant={!labelValidation.valid ? "destructive" : "default"} className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {labelValidation.warning}
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              💡 Keep it brief! Mind maps work best with concise labels (1-3 words)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-icon">Icon (Optional)</Label>
            <Select value={icon || "none"} onValueChange={(v) => setIcon(v === "none" ? undefined : v)}>
              <SelectTrigger id="node-icon">
                <SelectValue placeholder="Choose an icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Icon</SelectItem>
                {iconOptions.map((opt) => {
                  const IconComponent = getIconComponent(opt.value);
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
            <p className="text-xs text-muted-foreground">
              Icons improve visual memory and reduce reliance on text
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="node-importance">Importance</Label>
              <span className="text-xs font-medium text-primary">
                {importanceLabels[importance - 1]}
              </span>
            </div>
            <Slider
              id="node-importance"
              min={1}
              max={5}
              step={1}
              value={[importance]}
              onValueChange={(values: number[]) => setImportance(values[0])}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 - Minor</span>
              <span>3 - Key</span>
              <span>5 - Critical</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Rate importance to create visual hierarchy (affects node size)
            </p>
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
              Detailed Content (Optional)
            </Label>
            <Textarea
              id="node-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add longer explanations here (markdown supported)...&#10;&#10;Keep the label brief, put details here."
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 Use content for longer text—keep your label visual and memorable
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!label.trim() || !labelValidation.valid}>
            {initialData ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

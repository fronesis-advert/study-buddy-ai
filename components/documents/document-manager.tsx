"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

export type DocumentSummary = {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
};

type DocumentManagerProps = {
  documents: DocumentSummary[];
  onRefresh: () => Promise<void> | void;
};

export function DocumentManager({ documents, onRefresh }: DocumentManagerProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title || file.name);
        formData.append("sourceType", "upload");

        const response = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed. Please try again.");
        }
      } else if (text.trim()) {
        const response = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title || "Untitled notes",
            text,
            sourceType: "note",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to ingest notes.");
        }
      } else {
        throw new Error("Provide a file or some text to upload.");
      }
      setStatus("Document processed! You can now use it in chat and quizzes.");
      setTitle("");
      setText("");
      setFile(null);
      console.log("📄 Calling onRefresh after successful upload");
      // Force a small delay to ensure DB transaction completes
      await new Promise(resolve => setTimeout(resolve, 500));
      await onRefresh();
      console.log("📄 onRefresh completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document? This will also delete all associated chunks.")) {
      return;
    }

    try {
      setDeletingId(docId);
      const response = await fetch(`/api/documents?id=${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      await onRefresh();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm"
        onSubmit={handleUpload}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-title">Title</Label>
          <Input
            id="doc-title"
            placeholder="e.g. Chapter 5 notes"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-file">Upload PDF or text file</Label>
          <Input
            id="doc-file"
            type="file"
            accept=".pdf,.txt,.md,.json"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <Label htmlFor="doc-text">Or paste text</Label>
          <Textarea
            id="doc-text"
            rows={6}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste notes or a reading summary..."
          />
        </div>
        {status && <p className="text-sm text-emerald-600">{status}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Add to knowledge base"}
        </Button>
      </form>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Library</h3>
          <Badge variant="secondary">{documents.length} stored</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Documents are chunked, embedded, and available for retrieval in chat
          and quiz modes.
        </p>
        <ScrollArea className="h-[360px] rounded-md border bg-muted/20 p-3">
          <div className="flex flex-col gap-3">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documents yet. Upload a PDF or paste your own notes.
              </p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between gap-2 rounded-md bg-background p-3 shadow-sm"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{doc.source_type}</Badge>
                      <span>
                        Added{" "}
                        {new Date(doc.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

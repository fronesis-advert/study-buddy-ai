"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useChat, type Message } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DocumentSummary = {
  id: string;
  title: string;
  created_at?: string;
};

type ChatPanelProps = {
  documents: DocumentSummary[];
  onSessionChange?: (sessionId: string) => void;
};

const SOURCES_REGEX = /\[(S\d+)\]/g;

function MessageBubble({ message }: { message: Message }) {
  const variants: Record<Message["role"], string> = {
    user: "ml-auto bg-primary text-primary-foreground border-transparent",
    assistant:
      "mr-auto bg-muted text-foreground border border-border shadow-sm",
    system: "mx-auto bg-secondary text-secondary-foreground",
    tool: "mx-auto bg-secondary text-secondary-foreground",
    function: "mx-auto bg-secondary text-secondary-foreground",
    data: "mx-auto bg-secondary text-secondary-foreground",
  };

  const sources =
    message.role === "assistant"
      ? Array.from(
          new Set(
            [...message.content.matchAll(SOURCES_REGEX)].map((match) => match[1])
          )
        )
      : [];

  return (
    <div className="flex w-full flex-col gap-2">
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-3 text-sm shadow-sm sm:max-w-[70%]",
          variants[message.role] ?? variants.assistant
        )}
      >
        <ReactMarkdown
          className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:rounded-md prose-pre:bg-muted prose-pre:p-3"
          remarkPlugins={[remarkGfm]}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {sources.map((source) => (
            <Badge key={source} variant="outline">
              {source}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ documents, onSessionChange }: ChatPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<"chat" | "doc">("chat");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleDocument = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

  const chat = useChat({
    api: "/api/chat",
    body: {
      sessionId,
      documentIds: mode === "doc" ? selectedDocs : [],
      mode,
    },
    onResponse: (response) => {
      const header = response.headers.get("x-studybuddy-session");
      if (header) {
        setSessionId(header);
        onSessionChange?.(header);
      }
      setError(null);
    },
    onError: (err) => {
      console.error(err);
      setError(err.message);
    },
  });

  const hasContext = mode === "doc" && selectedDocs.length > 0;

  const latestAssistant = useMemo(
    () =>
      [...chat.messages]
        .reverse()
        .find((message) => message.role === "assistant"),
    [chat.messages]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Session</Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {sessionId ?? "New session"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button
            type="button"
            variant={mode === "chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("chat")}
          >
            General Tutor
          </Button>
          <Button
            type="button"
            variant={mode === "doc" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("doc")}
          >
            Document Q&A
          </Button>
          {chat.isLoading ? (
            <Button
              variant="outline"
              size="sm"
              onClick={chat.stop}
              className="ml-auto"
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSessionId(null);
                chat.setMessages([]);
              }}
              className="ml-auto"
            >
              Reset
            </Button>
          )}
        </div>
        {mode === "doc" && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
            <p className="text-sm font-medium">Document context</p>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Upload documents in the Documents tab to enable citations.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => toggleDocument(doc.id)}
                    />
                    <span>{doc.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-1 flex-col gap-4">
          {chat.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <p>
                Ask StudyBuddy anything! Provide a topic or paste a question to
                get started.
              </p>
              {mode === "doc" && (
                <Badge variant={hasContext ? "default" : "outline"}>
                  {hasContext
                    ? "Document context enabled"
                    : "Select documents to cite sources"}
                </Badge>
              )}
            </div>
          ) : (
            chat.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>
      </ScrollArea>

      {latestAssistant && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Follow-up ideas</p>
          <Separator className="my-2" />
          <p>
            Ask StudyBuddy to dig deeper into related concepts, generate a
            practice quiz, or synthesize notes for spaced repetition.
          </p>
        </div>
      )}

      <form
        onSubmit={chat.handleSubmit}
        className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm"
      >
        <Label htmlFor="chat-input">Your message</Label>
        <Textarea
          id="chat-input"
          value={chat.input}
          onChange={chat.handleInputChange}
          placeholder={
            mode === "doc"
              ? "Ask about your documents. Cite references with [S1]..."
              : "Ask a question or share what you are studying..."
          }
          rows={4}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              chat.handleSubmit(event as never);
            }
          }}
        />
        {error && (
          <p className="text-sm text-destructive">
            {error}. Please try again in a moment.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {mode === "doc"
              ? selectedDocs.length > 0
                ? `${selectedDocs.length} source${
                    selectedDocs.length > 1 ? "s" : ""
                  } attached`
                : "No sources selected"
              : "Streaming powered by GPT-4o mini"}
          </span>
          <Button type="submit" disabled={chat.isLoading || !chat.input.trim()}>
            {chat.isLoading ? "Generating..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}

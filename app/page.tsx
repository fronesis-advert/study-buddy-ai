
"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "@/components/chat/chat-panel";
import { QuizPanel } from "@/components/quiz/quiz-panel";
import { StudySessionPanel } from "@/components/study/study-session-panel";
import {
  DocumentManager,
  type DocumentSummary,
} from "@/components/documents/document-manager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type SessionTracker = {
  chat?: string | null;
  quiz?: string | null;
  study?: string | null;
};

async function fetchDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch("/api/documents");
  if (!response.ok) {
    throw new Error("Failed to load documents");
  }
  const payload = await response.json();
  return payload.documents ?? [];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<keyof SessionTracker>("chat");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionTracker>({});

  const refreshDocuments = async () => {
    try {
      console.log("🔄 Refreshing documents...");
      setLoadingDocs(true);
      const docs = await fetchDocuments();
      console.log("🔄 Fetched documents:", docs.length, docs);
      setDocuments(docs);
      setDocError(null);
    } catch (error) {
      console.error("🔄 Error refreshing documents:", error);
      setDocError(error instanceof Error ? error.message : "Failed to load");
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    void refreshDocuments();
  }, []);

  const activeSession = useMemo(
    () => sessions[activeTab] ?? null,
    [sessions, activeTab]
  );

  return (
    <main className="flex flex-1 flex-col gap-8">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              StudyBuddy AI
            </h1>
            <p className="text-sm text-muted-foreground">
              A single workspace for tutoring, adaptive quizzes, and focused
              study sessions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {loadingDocs ? "Loading documents..." : `${documents.length} docs`}
            </Badge>
            {activeSession && (
              <Badge variant="secondary">
                Session {activeSession.slice(0, 8)}
              </Badge>
            )}
          </div>
        </div>
        <Separator />
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as keyof SessionTracker)}>
          <TabsList>
            <TabsTrigger value="chat">Chat tutor</TabsTrigger>
            <TabsTrigger value="quiz">Quiz me</TabsTrigger>
            <TabsTrigger value="study">Study session</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <section className="flex flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as keyof SessionTracker)}
        >
          <TabsContent value="chat" className="mt-0">
            <ChatPanel
              documents={documents}
              onSessionChange={(sessionId) =>
                setSessions((prev) => ({ ...prev, chat: sessionId }))
              }
            />
          </TabsContent>
          <TabsContent value="quiz" className="mt-0">
            <QuizPanel
              documents={documents}
              onSessionChange={(sessionId) =>
                setSessions((prev) => ({ ...prev, quiz: sessionId }))
              }
            />
          </TabsContent>
          <TabsContent value="study" className="mt-0">
            <StudySessionPanel
              onSessionChange={(sessionId) =>
                setSessions((prev) => ({ ...prev, study: sessionId }))
              }
            />
          </TabsContent>
          <TabsContent value="documents" className="mt-0">
            <div className="flex flex-col gap-4">
              {docError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {docError}
                  <Button
                    variant="link"
                    className="ml-2 p-0 text-destructive underline"
                    onClick={() => void refreshDocuments()}
                  >
                    Retry
                  </Button>
                </div>
              )}
              <DocumentManager
                documents={documents}
                onRefresh={() => refreshDocuments()}
              />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

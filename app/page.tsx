
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
import { MindMapPanel } from "@/components/mindmap/mind-map-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Smartphone } from "lucide-react";

type SessionTracker = {
  chat?: string | null;
  quiz?: string | null;
  study?: string | null;
};

type TabValue = keyof SessionTracker | "documents" | "mindmaps";

async function fetchDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch("/api/documents");
  if (!response.ok) {
    throw new Error("Failed to load documents");
  }
  const payload = await response.json();
  return payload.documents ?? [];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabValue>("chat");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionTracker>({});
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const activeSession = useMemo(() => {
    if (activeTab === "documents" || activeTab === "mindmaps") return null;
    return sessions[activeTab] ?? null;
  }, [sessions, activeTab]);

  return (
    <main className="flex flex-1 flex-col gap-8">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              StudyBuddy AI
            </h1>
            <p className="text-sm text-muted-foreground">
              A single workspace for tutoring, adaptive quizzes, focused
              study sessions, and visual mind mapping.
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
          <TabsList>
            <TabsTrigger value="chat">Chat tutor</TabsTrigger>
            <TabsTrigger value="quiz">Quiz me</TabsTrigger>
            <TabsTrigger value="study">Study session</TabsTrigger>
            <TabsTrigger value="mindmaps" disabled={isMobile}>
              {isMobile ? (
                <>
                  <Smartphone className="h-3 w-3 mr-1" />
                  Mind Maps (Desktop only)
                </>
              ) : (
                "Mind Maps"
              )}
            </TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <section className="flex flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
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
          <TabsContent value="mindmaps" className="mt-0">
            {isMobile ? (
              <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
                <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Desktop Only Feature</h3>
                <p className="text-sm text-muted-foreground">
                  Mind mapping requires a larger screen for the best experience.
                  Please use a desktop or tablet device to access this feature.
                </p>
              </div>
            ) : (
              <MindMapPanel documents={documents} />
            )}
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


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
import FlashcardList from "@/components/flashcards/FlashcardList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFoldable } from "@/hooks/use-foldable";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { UserMenu } from "@/components/auth/user-menu";
import Link from "next/link";
import { 
  Smartphone, 
  MessageSquare, 
  BrainCircuit, 
  BookOpen, 
  Brain, 
  FileText, 
  Map,
  Info 
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

type SessionTracker = {
  chat?: string | null;
  quiz?: string | null;
  study?: string | null;
  flashcards?: string | null;
};

type TabValue = keyof SessionTracker | "documents" | "mindmaps" | "flashcards";

async function fetchDocuments(sessionId?: string | null): Promise<DocumentSummary[]> {
  const response = await fetch("/api/documents", {
    headers: {
      ...(sessionId ? { "x-studybuddy-session": sessionId } : {}),
    },
  });
  if (!response.ok) {
    throw new Error("Failed to load documents");
  }
  const payload = await response.json();
  return payload.documents ?? [];
}

const tabTriggerClass =
  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm sm:px-4 sm:py-2 sm:text-sm";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabValue>("chat");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionTracker>({});
  const [documentSessionId, setDocumentSessionId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const foldable = useFoldable();
  const supabase = createClientComponentClient();

  // Check user authentication
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check if mind maps should be available (desktop or foldable device)
  const mindMapsAvailable = !isMobile || foldable.isFoldable;

  const refreshDocuments = async () => {
    try {
      console.log("🔄 Refreshing documents...");
      setLoadingDocs(true);
      const docs = await fetchDocuments(documentSessionId);
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

  // Refresh documents when session changes
  useEffect(() => {
    if (documentSessionId) {
      void refreshDocuments();
    }
  }, [documentSessionId]);

  const activeSession = useMemo(() => {
    if (activeTab === "documents" || activeTab === "mindmaps") return null;
    return sessions[activeTab] ?? null;
  }, [sessions, activeTab]);

  return (
    <main className="flex flex-1 flex-col gap-4 md:gap-8">
      <header className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm md:gap-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              StudyBuddy AI
            </h1>
            <p className="text-xs text-muted-foreground md:text-sm">
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
            {/* Auth UI */}
            {user ? (
              <UserMenu user={user} />
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Guest Mode Banner */}
        {!user && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Try Study Buddy for free!</strong> You're exploring as a guest. 
              <Link href="/signup" className="ml-1 font-semibold underline underline-offset-2 hover:text-blue-600">
                Sign up
              </Link>
              {" "}to save your work, create flashcards, and track your progress.
            </AlertDescription>
          </Alert>
        )}

        <Separator className="hidden md:block" />
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="hidden md:block">
          <TabsList className="flex w-full flex-nowrap gap-1 overflow-x-auto rounded-full border bg-muted/30 p-1 text-xs shadow-inner sm:gap-2 sm:text-sm md:justify-center">
            <TabsTrigger
              value="chat"
              className={tabTriggerClass}
            >
              Chat tutor
            </TabsTrigger>
            <TabsTrigger
              value="quiz"
              className={tabTriggerClass}
            >
              Quiz me
            </TabsTrigger>
            <TabsTrigger
              value="study"
              className={tabTriggerClass}
            >
              Study session
            </TabsTrigger>
            <TabsTrigger
              value="flashcards"
              className={tabTriggerClass}
            >
              Flashcards
            </TabsTrigger>
            <TabsTrigger
              value="mindmaps"
              disabled={!mindMapsAvailable}
              className={tabTriggerClass}
            >
              {!mindMapsAvailable ? (
                <>
                  <Smartphone className="h-3 w-3 mr-1" />
                  Mind Maps (Desktop only)
                </>
              ) : foldable.isFoldable ? (
                <>
                  <Map className="h-3 w-3 mr-1" />
                  Mind Maps
                </>
              ) : (
                "Mind Maps"
              )}
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className={tabTriggerClass}
            >
              Documents
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <section className="flex flex-1 flex-col pb-20 md:pb-0">
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
            {!mindMapsAvailable ? (
              <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
                <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Desktop Only Feature</h3>
                <p className="text-sm text-muted-foreground">
                  Mind mapping requires a larger screen for the best experience.
                  Please use a desktop, tablet, or foldable device to access this feature.
                </p>
              </div>
            ) : (
              <MindMapPanel documents={documents} />
            )}
          </TabsContent>
          <TabsContent value="flashcards" className="mt-0">
            <FlashcardList
              sessionId={sessions.flashcards}
              onSessionChange={(sessionId) =>
                setSessions((prev) => ({ ...prev, flashcards: sessionId }))
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
                onSessionChange={setDocumentSessionId}
                isAuthenticated={!!user}
              />
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              activeTab === "chat"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              activeTab === "quiz"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BrainCircuit className="h-5 w-5" />
            <span>Quiz</span>
          </button>
          <button
            onClick={() => setActiveTab("study")}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              activeTab === "study"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Study</span>
          </button>
          <button
            onClick={() => setActiveTab("flashcards")}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              activeTab === "flashcards"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Brain className="h-5 w-5" />
            <span>Cards</span>
          </button>
          {/* Show Mind Maps on foldable devices */}
          {foldable.isFoldable && (
            <button
              onClick={() => setActiveTab("mindmaps")}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                activeTab === "mindmaps"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Map className="h-5 w-5" />
              <span>Maps</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              activeTab === "documents"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-5 w-5" />
            <span>Docs</span>
          </button>
        </div>
      </nav>
    </main>
  );
}

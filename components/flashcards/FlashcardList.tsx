"use client";

import { useState, useEffect, useCallback } from "react";
import { FlashcardDeckStats } from "@/types/flashcard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Brain, Plus, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import {
  getStoredFlashcardSession,
  storeFlashcardSession,
} from "@/lib/flashcards/session-storage";

type FlashcardListProps = {
  sessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
  showHeader?: boolean;
};

export default function FlashcardList({
  sessionId: externalSessionId = null,
  onSessionChange,
  showHeader = true,
}: FlashcardListProps) {
  const [decks, setDecks] = useState<FlashcardDeckStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
const [sessionId, setSessionId] = useState<string | null>(() =>
  externalSessionId ?? getStoredFlashcardSession()
);

  useEffect(() => {
    if (!externalSessionId || externalSessionId === sessionId) return;
    setSessionId(externalSessionId);
    storeFlashcardSession(externalSessionId);
  }, [externalSessionId, sessionId]);

  const applySessionFromResponse = useCallback(
    (response: Response) => {
      const header = response.headers.get("x-studybuddy-session");
      if (header && header !== sessionId) {
        setSessionId(header);
        storeFlashcardSession(header);
        onSessionChange?.(header);
      }
      return response;
    },
    [sessionId, onSessionChange]
  );

  const withSessionHeaders = useCallback(
    (init?: RequestInit): RequestInit => ({
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...(sessionId ? { "x-studybuddy-session": sessionId } : {}),
      },
    }),
    [sessionId]
  );

  useEffect(() => {
    loadDecks();
  }, [sessionId]);

  async function loadDecks() {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/flashcards/decks",
        withSessionHeaders()
      );
      applySessionFromResponse(response);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load decks");
      }

      setDecks(data.decks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load decks");
    } finally {
      setLoading(false);
    }
  }

  async function deleteDeck(deckId: string) {
    if (!confirm("Delete this deck and all its cards?")) return;

    try {
      const response = await fetch(
        `/api/flashcards/decks/${deckId}`,
        withSessionHeaders({ method: "DELETE" })
      );
      applySessionFromResponse(response);

      if (!response.ok) {
        throw new Error("Failed to delete deck");
      }

      setDecks(decks.filter((d) => d.deck_id !== deckId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete deck");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading decks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Flashcard Decks</h2>
            <p className="text-sm text-muted-foreground">
              Review and manage your flashcard decks
            </p>
          </div>
          <Link href="/flashcards/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Deck
            </Button>
          </Link>
        </div>
      )}

      {decks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No flashcard decks yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create a deck manually or generate one from a document
            </p>
            <Link href="/flashcards/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Deck
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Card key={deck.deck_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{deck.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {deck.total_cards} card{deck.total_cards !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteDeck(deck.deck_id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Due:</span>
                    <span className="font-medium text-orange-600">
                      {deck.cards_due || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reviewed:</span>
                    <span className="font-medium">
                      {deck.reviewed_cards || 0}
                    </span>
                  </div>
                  {deck.last_reviewed_at && (
                    <div className="text-xs text-muted-foreground">
                      Last review:{" "}
                      {new Date(deck.last_reviewed_at).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/flashcards/${deck.deck_id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link
                      href={`/flashcards/${deck.deck_id}/study`}
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full">
                        <Brain className="mr-2 h-4 w-4" />
                        Study
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

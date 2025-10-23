"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FlashcardDeck, Flashcard } from "@/types/flashcard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Brain, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import FlashcardEditor from "@/components/flashcards/FlashcardEditor";
import {
  getStoredFlashcardSession,
  storeFlashcardSession,
} from "@/lib/flashcards/session-storage";

export default function FlashcardDeckPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;

  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCards, setShowAddCards] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() =>
    getStoredFlashcardSession()
  );

  const rememberSession = (response: Response) => {
    const header = response.headers.get("x-studybuddy-session");
    if (header && header !== sessionId) {
      setSessionId(header);
      storeFlashcardSession(header);
    }
  };

  useEffect(() => {
    loadDeck();
  }, [deckId, sessionId]);

  async function loadDeck() {
    try {
      setLoading(true);
      const response = await fetch(`/api/flashcards/decks/${deckId}`, {
        headers: {
          ...(sessionId ? { "x-studybuddy-session": sessionId } : {}),
        },
      });
      rememberSession(response);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load deck");
      }

      setDeck(data.deck);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load deck");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCard(cardId: string) {
    if (!confirm("Delete this card?")) return;

    try {
      const response = await fetch(`/api/flashcards/cards/${cardId}`, {
        method: "DELETE",
        headers: {
          ...(sessionId ? { "x-studybuddy-session": sessionId } : {}),
        },
      });
      rememberSession(response);

      if (!response.ok) {
        throw new Error("Failed to delete card");
      }

      // Refresh deck
      loadDeck();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete card");
    }
  }

  if (loading) {
    return (
      <main className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading deck...</div>
        </div>
      </main>
    );
  }

  if (!deck) {
    return (
      <main className="container max-w-6xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium mb-2">Deck not found</p>
            <Link href="/flashcards">
              <Button>Back to Decks</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const cards = deck.flashcards || [];

  return (
    <main className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/flashcards">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Decks
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{deck.name}</h1>
            {deck.description && (
              <p className="text-muted-foreground mt-2">{deck.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {cards.length} card{cards.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddCards(!showAddCards)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Cards
            </Button>
            {cards.length > 0 && (
              <Link href={`/flashcards/${deckId}/study`}>
                <Button>
                  <Brain className="mr-2 h-4 w-4" />
                  Study Now
                </Button>
              </Link>
            )}
          </div>
        </div>

        {showAddCards && (
          <FlashcardEditor
            deckId={deckId}
            onSave={() => {
              setShowAddCards(false);
              loadDeck();
            }}
            sessionId={sessionId}
            onSessionChange={(value) => {
              setSessionId(value);
              storeFlashcardSession(value);
            }}
          />
        )}

        {cards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No cards yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add some flashcards to start studying
              </p>
              <Button onClick={() => setShowAddCards(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Cards
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">All Cards</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {cards.map((card) => (
                <Card key={card.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">Question</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCard(card.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription className="mt-2">
                      {card.front}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Answer</p>
                      <p className="text-sm text-muted-foreground">{card.back}</p>
                      {card.hint && (
                        <>
                          <p className="text-sm font-medium mt-4">Hint</p>
                          <p className="text-sm text-muted-foreground italic">
                            {card.hint}
                          </p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { FlashcardWithReview } from "@/types/flashcard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, RotateCcw, CheckCircle } from "lucide-react";
import {
  getStoredFlashcardSession,
  storeFlashcardSession,
} from "@/lib/flashcards/session-storage";

interface FlashcardReviewProps {
  deckId: string;
}

export default function FlashcardReview({ deckId }: FlashcardReviewProps) {
  const [cards, setCards] = useState<FlashcardWithReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [completed, setCompleted] = useState(false);
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
    loadDueCards();
  }, [deckId, sessionId]);

  async function loadDueCards() {
    try {
      setLoading(true);
      const response = await fetch(`/api/flashcards/due?deck_id=${deckId}`, {
        headers: {
          ...(sessionId ? { "x-studybuddy-session": sessionId } : {}),
        },
      });
      rememberSession(response);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load cards");
      }

      // Combine new cards and due cards
      const reviewCards = [...(data.new_cards || []), ...(data.due_cards || [])];
      setCards(reviewCards);

      if (reviewCards.length === 0) {
        setCompleted(true);
      }
    } catch (err) {
      console.error("Failed to load cards:", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitReview(rating: number) {
    if (reviewing || currentIndex >= cards.length) return;

    const card = cards[currentIndex];
    setReviewing(true);

    try {
      const response = await fetch(`/api/flashcards/cards/${card.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-studybuddy-session": sessionId } : {}),
        },
        body: JSON.stringify({ rating }),
      });
      rememberSession(response);

      if (!response.ok) {
        throw new Error("Failed to save review");
      }

      // Move to next card
      if (currentIndex + 1 >= cards.length) {
        setCompleted(true);
      } else {
        setCurrentIndex(currentIndex + 1);
        setFlipped(false);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setReviewing(false);
    }
  }

  function handleFlip() {
    setFlipped(!flipped);
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.code === "Space") {
      e.preventDefault();
      handleFlip();
    } else if (flipped) {
      if (e.code === "Digit1") submitReview(1);
      else if (e.code === "Digit2") submitReview(2);
      else if (e.code === "Digit3") submitReview(3);
      else if (e.code === "Digit4") submitReview(4);
      else if (e.code === "Digit5") submitReview(5);
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [flipped, currentIndex, reviewing]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading cards...</div>
      </div>
    );
  }

  if (completed || cards.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-2xl font-bold mb-2">All done!</h3>
          <p className="text-muted-foreground mb-6">
            {cards.length === 0
              ? "No cards due for review right now."
              : "You've reviewed all cards in this deck."}
          </p>
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Review Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="relative h-80 cursor-pointer perspective-1000"
        onClick={handleFlip}
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front */}
          <Card
            className={`absolute inset-0 backface-hidden ${
              flipped ? "invisible" : "visible"
            }`}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-8">
              <Brain className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-xl font-medium text-center">
                {currentCard.front}
              </p>
              {currentCard.hint && !flipped && (
                <p className="text-sm text-muted-foreground mt-4 italic">
                  Hint: {currentCard.hint}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-6">
                Click or press Space to reveal
              </p>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className={`absolute inset-0 backface-hidden rotate-y-180 ${
              flipped ? "visible" : "invisible"
            }`}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-8">
              <p className="text-xl text-center mb-8">{currentCard.back}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rating Buttons */}
      {flipped && (
        <div className="grid grid-cols-5 gap-2">
          <Button
            variant="outline"
            onClick={() => submitReview(1)}
            disabled={reviewing}
            className="flex-col h-auto py-3"
          >
            <span className="font-bold text-lg">1</span>
            <span className="text-xs">Again</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => submitReview(2)}
            disabled={reviewing}
            className="flex-col h-auto py-3"
          >
            <span className="font-bold text-lg">2</span>
            <span className="text-xs">Hard</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => submitReview(3)}
            disabled={reviewing}
            className="flex-col h-auto py-3"
          >
            <span className="font-bold text-lg">3</span>
            <span className="text-xs">Good</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => submitReview(4)}
            disabled={reviewing}
            className="flex-col h-auto py-3"
          >
            <span className="font-bold text-lg">4</span>
            <span className="text-xs">Easy</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => submitReview(5)}
            disabled={reviewing}
            className="flex-col h-auto py-3"
          >
            <span className="font-bold text-lg">5</span>
            <span className="text-xs">Perfect</span>
          </Button>
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Keyboard shortcuts: Space (flip) • 1-5 (rate when flipped)
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import {
  getStoredFlashcardSession,
  storeFlashcardSession,
} from "@/lib/flashcards/session-storage";

interface CardData {
  front: string;
  back: string;
  hint?: string;
}

interface FlashcardEditorProps {
  deckId?: string;
  initialCards?: CardData[];
  onSave?: (cards: CardData[]) => void;
  sessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
}

export default function FlashcardEditor({
  deckId,
  initialCards = [],
  onSave,
  sessionId: externalSessionId = null,
  onSessionChange,
}: FlashcardEditorProps) {
  const [cards, setCards] = useState<CardData[]>(
    initialCards.length > 0 ? initialCards : [{ front: "", back: "", hint: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() =>
    externalSessionId ?? getStoredFlashcardSession()
  );

  useEffect(() => {
    if (!externalSessionId || externalSessionId === sessionId) {
      if (!externalSessionId) {
        const stored = getStoredFlashcardSession();
        if (stored && stored !== sessionId) {
          setSessionId(stored);
          onSessionChange?.(stored);
        }
      }
      return;
    }
    setSessionId(externalSessionId);
    storeFlashcardSession(externalSessionId);
    onSessionChange?.(externalSessionId);
  }, [externalSessionId, sessionId, onSessionChange]);

  const rememberSession = (response: Response) => {
    const header = response.headers.get("x-studybuddy-session");
    if (header && header !== sessionId) {
      setSessionId(header);
      storeFlashcardSession(header);
      onSessionChange?.(header);
    }
  };

  const sessionHeaders = {
    ...(sessionId ? { "x-studybuddy-session": sessionId } : {}),
  };

  function addCard() {
    setCards([...cards, { front: "", back: "", hint: "" }]);
  }

  function removeCard(index: number) {
    setCards(cards.filter((_, i) => i !== index));
  }

  function updateCard(index: number, field: keyof CardData, value: string) {
    const updated = [...cards];
    updated[index] = { ...updated[index], [field]: value };
    setCards(updated);
  }

  async function handleSave() {
    if (!deckId) {
      if (onSave) {
        onSave(cards);
      }
      return;
    }

    // Validate cards
    const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      alert("Please add at least one card with front and back text");
      return;
    }

    setSaving(true);
    try {
      // Save each card
      const promises = validCards.map((card) =>
        fetch(`/api/flashcards/decks/${deckId}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...sessionHeaders },
          body: JSON.stringify(card),
        })
      );

      const results = await Promise.all(promises);
      results.forEach(rememberSession);
      const failed = results.filter((r) => !r.ok);

      if (failed.length > 0) {
        throw new Error(`Failed to save ${failed.length} cards`);
      }

      alert(`Successfully saved ${validCards.length} cards!`);
      
      // Reset or redirect
      if (onSave) {
        onSave(validCards);
      } else {
        window.location.href = `/flashcards/${deckId}`;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save cards");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Add Cards</h3>
          <p className="text-sm text-muted-foreground">
            Create flashcards manually
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addCard}>
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Card {index + 1}</CardTitle>
                {cards.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCard(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`front-${index}`}>Front (Question)</Label>
                <Textarea
                  id={`front-${index}`}
                  placeholder="What is the capital of France?"
                  value={card.front}
                  onChange={(e) => updateCard(index, "front", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`back-${index}`}>Back (Answer)</Label>
                <Textarea
                  id={`back-${index}`}
                  placeholder="Paris"
                  value={card.back}
                  onChange={(e) => updateCard(index, "back", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hint-${index}`}>Hint (Optional)</Label>
                <Input
                  id={`hint-${index}`}
                  placeholder="Think about French geography"
                  value={card.hint || ""}
                  onChange={(e) => updateCard(index, "hint", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {cards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No cards yet</p>
            <Button onClick={addCard}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Card
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

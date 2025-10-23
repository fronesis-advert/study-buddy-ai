"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlashcardEditor from "@/components/flashcards/FlashcardEditor";
import { ArrowLeft, Sparkles, Plus } from "lucide-react";
import Link from "next/link";
import {
  getStoredFlashcardSession,
  storeFlashcardSession,
} from "@/lib/flashcards/session-storage";

interface CardData {
  front: string;
  back: string;
  hint?: string;
}

export default function NewFlashcardDeckPage() {
  const router = useRouter();
  const [deckName, setDeckName] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [generationMode, setGenerationMode] = useState<"manual" | "ai">("manual");
  const [generationText, setGenerationText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [createdDeckId, setCreatedDeckId] = useState<string | null>(null);
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

  const sessionHeaders = {
    ...(sessionId ? { "x-studybuddy-session": sessionId } : {}),
  };

  async function createDeck() {
    if (!deckName.trim()) {
      alert("Please enter a deck name");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/flashcards/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          name: deckName,
          description: deckDescription,
        }),
      });
      rememberSession(response);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create deck");
      }

      setCreatedDeckId(data.deck.id);
      return data.deck.id;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create deck");
      setCreating(false);
      return null;
    }
  }

  async function generateWithAI() {
    if (!generationText.trim()) {
      alert("Please enter some text to generate flashcards from");
      return;
    }

    if (!deckName.trim()) {
      alert("Please enter a deck name");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...sessionHeaders },
        body: JSON.stringify({
          text: generationText,
          deck_name: deckName,
          deck_description: deckDescription,
        }),
      });
      rememberSession(response);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate flashcards");
      }

      alert(`Successfully generated ${data.count} flashcards!`);
      router.push(`/flashcards/${data.deck.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate flashcards");
    } finally {
      setGenerating(false);
    }
  }

  async function handleManualSave(cards: CardData[]) {
    const deckId = createdDeckId || (await createDeck());
    if (deckId) {
      router.push(`/flashcards/${deckId}`);
    }
  }

  return (
    <main className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/flashcards">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Decks
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Flashcard Deck</h1>
          <p className="text-muted-foreground">
            Create a new deck manually or generate cards with AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deck Details</CardTitle>
            <CardDescription>Name and describe your flashcard deck</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name">Deck Name</Label>
              <Input
                id="deck-name"
                placeholder="e.g., French Vocabulary, Biology Chapter 3"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deck-description">Description (Optional)</Label>
              <Textarea
                id="deck-description"
                placeholder="What topics does this deck cover?"
                value={deckDescription}
                onChange={(e) => setDeckDescription(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={generationMode} onValueChange={(v) => setGenerationMode(v as "manual" | "ai")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <Plus className="mr-2 h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-6">
            {createdDeckId || deckName ? (
              <FlashcardEditor
                deckId={createdDeckId || undefined}
                onSave={handleManualSave}
                sessionId={sessionId}
                onSessionChange={setSessionId}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Enter a deck name above to start adding cards
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Flashcards with AI</CardTitle>
                <CardDescription>
                  Paste text or notes and AI will generate flashcards automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="generation-text">Content</Label>
                  <Textarea
                    id="generation-text"
                    placeholder="Paste your study notes, article, or any text here..."
                    value={generationText}
                    onChange={(e) => setGenerationText(e.target.value)}
                    rows={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    AI will analyze this text and create focused flashcards
                  </p>
                </div>
                <Button
                  onClick={generateWithAI}
                  disabled={generating || !deckName.trim() || !generationText.trim()}
                  className="w-full"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generating ? "Generating..." : "Generate Flashcards"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

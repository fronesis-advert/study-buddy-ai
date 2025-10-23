"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import FlashcardList from "@/components/flashcards/FlashcardList";

export default function FlashcardsPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Flashcard Decks
          </h1>
          <p className="text-muted-foreground">
            Review and manage your flashcard decks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/flashcards/new" passHref>
            <Button>
              New Deck
            </Button>
          </Link>
          <Link href="/" passHref>
            <Button variant="ghost" size="sm">
              Back to Workspace
            </Button>
          </Link>
        </div>
      </div>

      <FlashcardList showHeader={false} />
    </main>
  );
}

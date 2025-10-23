"use client";

import { useParams } from "next/navigation";
import FlashcardReview from "@/components/flashcards/FlashcardReview";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FlashcardStudyPage() {
  const params = useParams();
  const deckId = params.deckId as string;

  return (
    <main className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href={`/flashcards/${deckId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deck
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Study Session</h1>
          <p className="text-muted-foreground">
            Review your flashcards and track your progress
          </p>
        </div>

        <FlashcardReview deckId={deckId} />
      </div>
    </main>
  );
}

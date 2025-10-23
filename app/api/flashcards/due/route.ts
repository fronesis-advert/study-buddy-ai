import { NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { ensureSession } from "@/lib/sessions";

export const runtime = "edge";

// GET /api/flashcards/due - Get all cards due for review
export async function GET(request: NextRequest) {
  const headers = new Headers({ "Content-Type": "application/json" });
  let sessionId: string | null = null;

  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    sessionId = await ensureSession({
      sessionId: request.headers.get("x-studybuddy-session"),
      userId,
      mode: "flashcards",
      meta: { source: "flashcards-due" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get("deck_id");

    // Fetch all cards from user's decks
    let cardsQuery = supabase
      .from("flashcards")
      .select(`
        *,
        deck:flashcard_decks!inner(id, name, user_id, session_id)
      `)
      .eq(
        userId ? "deck.user_id" : "deck.session_id",
        userId ?? sessionId
      );

    if (deckId) {
      cardsQuery = cardsQuery.eq("deck_id", deckId);
    }

    const { data: cards, error: cardsError } = await cardsQuery;

    if (cardsError) {
      console.error("[flashcards/due] cards fetch error", cardsError);
      return new Response(
        JSON.stringify({ error: "Failed to load cards" }),
        {
          status: 500,
          headers,
        }
      );
    }

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ cards: [], new_cards: [], due_cards: [] }),
        {
          status: 200,
          headers,
        }
      );
    }

    // Get latest review for each card
    const cardIds = cards.map((c) => c.id);
    const { data: reviews } = await supabase
      .from("flashcard_reviews")
      .select("*")
      .in("flashcard_id", cardIds)
      .eq(userId ? "user_id" : "session_id", userId ?? sessionId);

    // Build a map of card_id -> latest review
    type Review = NonNullable<typeof reviews>[number];
    const latestReviews = new Map<string, Review>();
    if (reviews) {
      reviews.forEach((review) => {
        const key = review.flashcard_id;
        if (!key) {
          return;
        }

        const existing = latestReviews.get(key);
        const reviewDate = review.reviewed_at
          ? new Date(review.reviewed_at)
          : null;
        const existingDate = existing?.reviewed_at
          ? new Date(existing.reviewed_at)
          : null;

        const isMoreRecent =
          reviewDate &&
          (!existingDate || reviewDate.getTime() > existingDate.getTime());

        if (!existing || isMoreRecent) {
          latestReviews.set(key, review);
        }
      });
    }

    // Categorize cards
    const now = new Date();
    const newCards: any[] = [];
    const dueCards: any[] = [];
    const upcomingCards: any[] = [];

    cards.forEach((card) => {
      const latestReview = latestReviews.get(card.id);

      if (!latestReview) {
        // Never reviewed - it's a new card
        newCards.push({ ...card, status: "new" });
      } else {
        const nextReviewDate = latestReview.next_review_at
          ? new Date(latestReview.next_review_at)
          : null;
        if (!nextReviewDate || nextReviewDate <= now) {
          // Due for review
          dueCards.push({
            ...card,
            status: "due",
            next_review_at: latestReview.next_review_at,
          });
        } else {
          // Upcoming review
          upcomingCards.push({
            ...card,
            status: "upcoming",
            next_review_at: latestReview.next_review_at,
          });
        }
      }
    });

    return new Response(
      JSON.stringify({
        cards: cards.length,
        new_cards: newCards,
        due_cards: dueCards,
        upcoming_cards: upcomingCards,
        stats: {
          total: cards.length,
          new: newCards.length,
          due: dueCards.length,
          upcoming: upcomingCards.length,
        },
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error("[flashcards/due] error", error);
    return new Response(
      JSON.stringify({ error: "Failed to load due cards" }),
      {
        status: 500,
        headers,
      }
    );
  }
}


import { NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { ensureSession } from "@/lib/sessions";

export const runtime = "edge";

/**
 * SM-2 Spaced Repetition Algorithm
 * Rating scale: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy), 5 (Perfect)
 */
function calculateNextReview(
  rating: number,
  currentEaseFactor: number = 2.5,
  currentInterval: number = 1
): { easeFactor: number; interval: number; nextReviewAt: Date } {
  let easeFactor = currentEaseFactor;
  let interval = currentInterval;

  // Update ease factor based on rating
  if (rating >= 3) {
    // Good or better
    easeFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  } else {
    // Hard or Again
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  // Ensure ease factor stays within reasonable bounds
  easeFactor = Math.max(1.3, Math.min(2.5, easeFactor));

  // Calculate interval based on rating
  if (rating === 1) {
    // Again - reset to 1 day
    interval = 1;
  } else if (rating === 2) {
    // Hard - slightly longer than last time but not by much
    interval = Math.max(1, Math.floor(interval * 1.2));
  } else if (rating === 3) {
    // Good - standard progression
    if (interval === 1) {
      interval = 6; // First successful review: 6 days
    } else {
      interval = Math.round(interval * easeFactor);
    }
  } else {
    // Easy or Perfect - longer progression
    if (interval === 1) {
      interval = 4; // Skip ahead more
    } else {
      interval = Math.round(interval * easeFactor * 1.3);
    }
  }

  // Calculate next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return { easeFactor, interval, nextReviewAt };
}

// POST /api/flashcards/cards/[cardId]/review - Record a card review
export async function POST(
  request: NextRequest,
  { params }: { params: { cardId: string } }
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  let sessionId: string | null = null;

  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();
    const { cardId } = params;

    sessionId = await ensureSession({
      sessionId: request.headers.get("x-studybuddy-session"),
      userId,
      mode: "flashcards",
      meta: { cardId, source: "flashcards-review-post" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    // Verify card ownership
    const { data: card } = await supabase
      .from("flashcards")
      .select(`id, deck:flashcard_decks!inner(user_id, session_id)`)
      .eq("id", cardId)
      .single();

    const deck = card?.deck as { user_id: string | null; session_id: string | null } | undefined;

    const ownsCard = card
      ? userId
        ? deck?.user_id === userId
        : sessionId && deck?.session_id === sessionId
      : false;

    if (!card || !ownsCard) {
      return new Response(
        JSON.stringify({ error: "Card not found or unauthorized" }),
        {
          status: 404,
          headers,
        }
      );
    }

    const body = await request.json();
    const { rating } = body;

    if (!rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: "Rating must be between 1 and 5" }),
        {
          status: 400,
          headers,
        }
      );
    }

    // Get the most recent review for this card
    const { data: lastReview } = await supabase
      .from("flashcard_reviews")
      .select("ease_factor, interval_days")
      .eq("flashcard_id", cardId)
      .eq(userId ? "user_id" : "session_id", userId ?? sessionId)
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .single();

    // Calculate next review using SM-2
    const currentEaseFactor = lastReview?.ease_factor ?? 2.5;
    const currentInterval = lastReview?.interval_days ?? 1;
    const { easeFactor, interval, nextReviewAt } = calculateNextReview(
      rating,
      currentEaseFactor,
      currentInterval
    );

    // Insert new review record
    const { data: review, error } = await supabase
      .from("flashcard_reviews")
      .insert({
        flashcard_id: cardId,
        user_id: userId,
        session_id: sessionId,
        rating,
        ease_factor: easeFactor,
        interval_days: interval,
        next_review_at: nextReviewAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[flashcards/review] create error", error);
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to save review" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(
      JSON.stringify({
        review,
        nextReviewIn: `${interval} day${interval !== 1 ? "s" : ""}`,
      }),
      {
        status: 201,
        headers,
      }
    );
  } catch (error) {
    console.error("[flashcards/review] error", error);
    return new Response(JSON.stringify({ error: "Failed to save review" }), {
      status: 500,
      headers,
    });
  }
}

// GET /api/flashcards/cards/[cardId]/review - Get cards due for review
export async function GET(
  _request: NextRequest,
  { params }: { params: { cardId: string } }
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  let sessionId: string | null = null;

  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();
    const { cardId } = params;

    sessionId = await ensureSession({
      sessionId: _request.headers.get("x-studybuddy-session"),
      userId,
      mode: "flashcards",
      meta: { cardId, source: "flashcards-review-get" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    // Get review history for this card
    const { data: reviews, error } = await supabase
      .from("flashcard_reviews")
      .select("*")
      .eq("flashcard_id", cardId)
      .eq(userId ? "user_id" : "session_id", userId ?? sessionId)
      .order("reviewed_at", { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to load reviews" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(JSON.stringify({ reviews: reviews ?? [] }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/review] error", error);
    return new Response(JSON.stringify({ error: "Failed to load reviews" }), {
      status: 500,
      headers,
    });
  }
}

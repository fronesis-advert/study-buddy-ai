import { NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { ensureSession } from "@/lib/sessions";

export const runtime = "edge";

// GET /api/flashcards/decks/[deckId]/cards - Get all cards in a deck with review status
export async function GET(
  _request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  let sessionId: string | null = null;

  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();
    const { deckId } = params;

    sessionId = await ensureSession({
      sessionId: _request.headers.get("x-studybuddy-session"),
      userId,
      mode: "flashcards",
      meta: { deckId, source: "flashcards-cards-get" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    // Verify deck ownership
    const { data: deckRecord } = await supabase
      .from("flashcard_decks")
      .select("id, user_id, session_id")
      .eq("id", deckId)
      .maybeSingle();

    if (
      !deckRecord ||
      (userId
        ? deckRecord.user_id !== userId
        : deckRecord.session_id !== sessionId)
    ) {
      return new Response(JSON.stringify({ error: "Deck not found" }), {
        status: 404,
        headers,
      });
    }

    // Fetch cards with latest review info
    const { data: cards, error } = await supabase
      .from("flashcards")
      .select(`
        *,
        latest_review:flashcard_reviews(
          rating,
          next_review_at,
          reviewed_at
        )
      `)
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[flashcards/cards] fetch error", error);
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to load cards" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(JSON.stringify({ cards: cards ?? [] }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/cards] error", error);
    return new Response(JSON.stringify({ error: "Failed to load cards" }), {
      status: 500,
      headers,
    });
  }
}

// POST /api/flashcards/decks/[deckId]/cards - Create a new card in a deck
export async function POST(
  request: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  let sessionId: string | null = null;

  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();
    const { deckId } = params;

    sessionId = await ensureSession({
      sessionId: request.headers.get("x-studybuddy-session"),
      userId,
      mode: "flashcards",
      meta: { deckId, source: "flashcards-cards-create" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    // Verify deck ownership
    const { data: deckRecord } = await supabase
      .from("flashcard_decks")
      .select("id, user_id, session_id")
      .eq("id", deckId)
      .maybeSingle();

    if (
      !deckRecord ||
      (userId
        ? deckRecord.user_id !== userId
        : deckRecord.session_id !== sessionId)
    ) {
      return new Response(JSON.stringify({ error: "Deck not found" }), {
        status: 404,
        headers,
      });
    }

    const body = await request.json();
    const { front, back, hint } = body;

    if (!front || !back) {
      return new Response(
        JSON.stringify({ error: "Front and back are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { data, error } = await supabase
      .from("flashcards")
      .insert({
        deck_id: deckId,
        session_id: sessionId,
        front,
        back,
        hint: hint || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[flashcards/cards] create error", error);
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to create card" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(JSON.stringify({ card: data }), {
      status: 201,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/cards] create error", error);
    return new Response(JSON.stringify({ error: "Failed to create card" }), {
      status: 500,
      headers,
    });
  }
}

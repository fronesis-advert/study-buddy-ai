import { NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { ensureSession } from "@/lib/sessions";

export const runtime = "edge";

// GET /api/flashcards/decks/[deckId] - Get a single deck with all cards
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
      meta: { deckId, source: "flashcards-deck-get" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    // Fetch deck with cards
    const { data: deck, error: deckError } = await supabase
      .from("flashcard_decks")
      .select("*, flashcards(*)")
      .eq("id", deckId)
      .maybeSingle();

    if (deckError || !deck) {
      return new Response(JSON.stringify({ error: "Deck not found" }), {
        status: 404,
        headers,
      });
    }

    const ownsDeck = userId
      ? deck.user_id === userId
      : sessionId && deck.session_id === sessionId;

    if (!ownsDeck) {
      return new Response(JSON.stringify({ error: "Deck not found" }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify({ deck }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/decks/[deckId]] error", error);
    return new Response(JSON.stringify({ error: "Failed to load deck" }), {
      status: 500,
      headers,
    });
  }
}

// PATCH /api/flashcards/decks/[deckId] - Update deck details
export async function PATCH(
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
      meta: { deckId, source: "flashcards-deck-update" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    const { data: deckRecord } = await supabase
      .from("flashcard_decks")
      .select("id, user_id, session_id")
      .eq("id", deckId)
      .maybeSingle();

    if (
      !deckRecord ||
      (userId ? deckRecord.user_id !== userId : deckRecord.session_id !== sessionId)
    ) {
      return new Response(JSON.stringify({ error: "Deck not found" }), {
        status: 404,
        headers,
      });
    }

    const body = await request.json();
    const { name, description } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: "No fields to update" }), {
        status: 400,
        headers,
      });
    }

    const { data, error } = await supabase
      .from("flashcard_decks")
      .update(updateData)
      .eq("id", deckId)
      .select()
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: error?.message ?? "Failed to update deck" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(JSON.stringify({ deck: data }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/decks/[deckId]] update error", error);
    return new Response(JSON.stringify({ error: "Failed to update deck" }), {
      status: 500,
      headers,
    });
  }
}

// DELETE /api/flashcards/decks/[deckId] - Delete a deck (cascade deletes cards)
export async function DELETE(
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
      meta: { deckId, source: "flashcards-deck-delete" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    const { data: deckRecord } = await supabase
      .from("flashcard_decks")
      .select("id, user_id, session_id")
      .eq("id", deckId)
      .maybeSingle();

    if (
      !deckRecord ||
      (userId ? deckRecord.user_id !== userId : deckRecord.session_id !== sessionId)
    ) {
      return new Response(JSON.stringify({ error: "Deck not found" }), {
        status: 404,
        headers,
      });
    }

    const { error } = await supabase
      .from("flashcard_decks")
      .delete()
      .eq("id", deckId);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to delete deck" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/decks/[deckId]] delete error", error);
    return new Response(JSON.stringify({ error: "Failed to delete deck" }), {
      status: 500,
      headers,
    });
  }
}

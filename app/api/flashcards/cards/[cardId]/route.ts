import { NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { ensureSession } from "@/lib/sessions";

export const runtime = "edge";

// GET /api/flashcards/cards/[cardId] - Get a single card
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
      meta: { cardId, source: "flashcards-card-get" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    // Fetch card and verify ownership through deck
    const { data: card, error } = await supabase
      .from("flashcards")
      .select(`
        *,
        deck:flashcard_decks!inner(id, user_id, session_id, name)
      `)
      .eq("id", cardId)
      .maybeSingle();

    if (!card || error) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers,
      });
    }

    const deck = card.deck as { user_id: string | null; session_id: string | null } | undefined;
    const ownsCard = userId
      ? deck?.user_id === userId
      : sessionId && deck?.session_id === sessionId;

    if (!ownsCard) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers,
      });
    }

    return new Response(JSON.stringify({ card }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/cards/[cardId]] error", error);
    return new Response(JSON.stringify({ error: "Failed to load card" }), {
      status: 500,
      headers,
    });
  }
}

// PATCH /api/flashcards/cards/[cardId] - Update a card
export async function PATCH(
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
      meta: { cardId, source: "flashcards-card-update" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    // Verify ownership
    const { data: card } = await supabase
      .from("flashcards")
      .select(`deck:flashcard_decks!inner(user_id, session_id)`)
      .eq("id", cardId)
      .maybeSingle();

    const deck = card?.deck as { user_id: string | null; session_id: string | null } | undefined;

    if (!deck || (userId ? deck.user_id !== userId : deck.session_id !== sessionId)) {
      return new Response(
        JSON.stringify({ error: "Card not found or unauthorized" }),
        {
          status: 404,
          headers,
        }
      );
    }

    const body = await request.json();
    const { front, back, hint } = body;

    const updateData: any = {};
    if (front !== undefined) updateData.front = front;
    if (back !== undefined) updateData.back = back;
    if (hint !== undefined) updateData.hint = hint;

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: "No fields to update" }), {
        status: 400,
        headers,
      });
    }

    const { data, error } = await supabase
      .from("flashcards")
      .update(updateData)
      .eq("id", cardId)
      .select()
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: error?.message ?? "Failed to update card" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(JSON.stringify({ card: data }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/cards/[cardId]] update error", error);
    return new Response(JSON.stringify({ error: "Failed to update card" }), {
      status: 500,
      headers,
    });
  }
}

// DELETE /api/flashcards/cards/[cardId] - Delete a card
export async function DELETE(
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
      meta: { cardId, source: "flashcards-card-delete" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    // Verify ownership
    const { data: card } = await supabase
      .from("flashcards")
      .select(`deck:flashcard_decks!inner(user_id, session_id)`)
      .eq("id", cardId)
      .maybeSingle();

    const deck = card?.deck as { user_id: string | null; session_id: string | null } | undefined;

    if (!deck || (userId ? deck.user_id !== userId : deck.session_id !== sessionId)) {
      return new Response(
        JSON.stringify({ error: "Card not found or unauthorized" }),
        {
          status: 404,
          headers,
        }
      );
    }

    const { error } = await supabase.from("flashcards").delete().eq("id", cardId);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to delete card" }),
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
    console.error("[flashcards/cards/[cardId]] delete error", error);
    return new Response(JSON.stringify({ error: "Failed to delete card" }), {
      status: 500,
      headers,
    });
  }
}

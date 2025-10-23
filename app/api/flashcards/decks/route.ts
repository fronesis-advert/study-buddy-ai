import { NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { ensureSession } from "@/lib/sessions";

export const runtime = "edge";

// GET /api/flashcards/decks - List all decks for the current user with stats
export async function GET(_req: NextRequest) {
  const headers = new Headers({ "Content-Type": "application/json" });
  let sessionId: string | null = null;

  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    sessionId = await ensureSession({
      sessionId: _req.headers.get("x-studybuddy-session"),
      userId,
      mode: "flashcards",
      meta: {
        source: "flashcards-list",
      },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    let query = supabase
      .from("flashcard_deck_stats")
      .select("*")
      .order("last_reviewed_at", { ascending: false, nullsFirst: false });

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (sessionId) {
      query = query.eq("session_id", sessionId);
    } else {
      // No identity, return empty list
      return new Response(JSON.stringify({ decks: [] }), {
        status: 200,
        headers,
      });
    }

    const { data, error } = await query;

    if (error) {
      console.error("[flashcards/decks] fetch error", error);
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to load decks" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(JSON.stringify({ decks: data ?? [] }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/decks] error", error);
    return new Response(JSON.stringify({ error: "Failed to load decks" }), {
      status: 500,
      headers,
    });
  }
}

// POST /api/flashcards/decks - Create a new deck
export async function POST(request: NextRequest) {
  const headers = new Headers({ "Content-Type": "application/json" });
  let sessionId: string | null = null;

  try {
    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    sessionId = await ensureSession({
      sessionId: request.headers.get("x-studybuddy-session"),
      userId,
      mode: "flashcards",
      meta: {
        source: "flashcards-create",
      },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    // Require authentication to save flashcard decks permanently
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          error: "Authentication required",
          message: "Please sign in to save flashcard decks permanently."
        }),
        { status: 401, headers }
      );
    }

    const body = await request.json();
    const { name, description, document_id } = body;

    if (!name || typeof name !== "string") {
      return new Response(JSON.stringify({ error: "Deck name is required" }), {
        status: 400,
        headers,
      });
    }

    const { data, error } = await supabase
      .from("flashcard_decks")
      .insert({
        user_id: userId,
        session_id: sessionId,
        name,
        description: description || null,
        document_id: document_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[flashcards/decks] create error", error);
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to create deck" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(JSON.stringify({ deck: data }), {
      status: 201,
      headers,
    });
  } catch (error) {
    console.error("[flashcards/decks] create error", error);
    return new Response(JSON.stringify({ error: "Failed to create deck" }), {
      status: 500,
      headers,
    });
  }
}

import { NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";
import { ensureSession } from "@/lib/sessions";
import { openaiClient } from "@/lib/openai";
import { FLASHCARD_GENERATION_PROMPT } from "@/lib/prompts";

export const runtime = "edge";

interface FlashcardData {
  front: string;
  back: string;
  hint?: string | null;
}

// POST /api/flashcards/generate - Generate flashcards from document or text
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
      meta: { source: "flashcards-generate" },
    });

    if (sessionId) {
      headers.set("x-studybuddy-session", sessionId);
    }

    const body = await request.json();
    const { document_id, text, deck_name, deck_description } = body;

    // Must provide either document_id or text
    if (!document_id && !text) {
      return new Response(
        JSON.stringify({ error: "Either document_id or text is required" }),
        {
          status: 400,
          headers,
        }
      );
    }

    let contentToProcess = text;
    let sourceDocumentId = null;
    let generatedDeckName = deck_name;

    // If document_id is provided, fetch document content
    if (document_id) {
      const documentQuery = supabase
        .from("documents")
        .select("id, title, user_id, raw_text")
        .eq("id", document_id);

      const { data: doc, error: docError } = await (userId
        ? documentQuery.eq("user_id", userId)
        : documentQuery.is("user_id", null)
      ).single();

      if (docError || !doc) {
        return new Response(JSON.stringify({ error: "Document not found" }), {
          status: 404,
          headers,
        });
      }

      // Fetch document chunks to build content
      const { data: chunks } = await supabase
        .from("chunks")
        .select("content")
        .eq("document_id", document_id)
        .order("created_at", { ascending: true })
        .limit(50); // Limit to first 50 chunks to avoid token limits

      if (chunks && chunks.length > 0) {
        contentToProcess = chunks.map((c) => c.content).join("\n\n");
      } else if (typeof doc.raw_text === "string" && doc.raw_text.trim().length > 0) {
        contentToProcess = doc.raw_text;
      }

      sourceDocumentId = document_id;
      if (!generatedDeckName) {
        generatedDeckName = `${doc.title} - Flashcards`;
      }
    }

    if (!contentToProcess) {
      return new Response(
        JSON.stringify({ error: "No content available to generate flashcards" }),
        {
          status: 400,
          headers,
        }
      );
    }

    // Use OpenAI to generate flashcards
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: FLASHCARD_GENERATION_PROMPT,
        },
        {
          role: "user",
          content: `Generate flashcards from this content:\n\n${contentToProcess.slice(0, 10000)}`, // Limit to 10k chars
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
      return new Response(
        JSON.stringify({ error: "Failed to generate flashcards" }),
        {
          status: 500,
          headers,
        }
      );
    }

    // Parse JSON response
    let flashcards: FlashcardData[];
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      flashcards = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("[flashcards/generate] JSON parse error", parseError);
      return new Response(
        JSON.stringify({
          error: "Failed to parse generated flashcards",
          raw: responseText,
        }),
        {
          status: 500,
          headers,
        }
      );
    }

    // Validate flashcard structure
    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid flashcards generated" }),
        {
          status: 500,
          headers,
        }
      );
    }

    // Create deck
    const { data: deck, error: deckError } = await supabase
      .from("flashcard_decks")
      .insert({
        user_id: userId,
        session_id: sessionId,
        name: generatedDeckName || "Generated Flashcards",
        description: deck_description || "AI-generated flashcards",
        document_id: sourceDocumentId,
      })
      .select()
      .single();

    if (deckError || !deck) {
      console.error("[flashcards/generate] deck creation error", deckError);
      return new Response(
        JSON.stringify({ error: "Failed to create deck" }),
        {
          status: 500,
          headers,
        }
      );
    }

    // Insert all flashcards into the deck
    const cardsToInsert = flashcards.map((card) => ({
      deck_id: deck.id,
      session_id: sessionId,
      front: card.front,
      back: card.back,
      hint: card.hint || null,
    }));

    const { data: insertedCards, error: cardsError } = await supabase
      .from("flashcards")
      .insert(cardsToInsert)
      .select();

    if (cardsError) {
      console.error("[flashcards/generate] cards insertion error", cardsError);
      // Clean up the deck if card insertion fails
      await supabase.from("flashcard_decks").delete().eq("id", deck.id);
      return new Response(
        JSON.stringify({ error: "Failed to create flashcards" }),
        {
          status: 500,
          headers,
        }
      );
    }

    return new Response(
      JSON.stringify({
        deck,
        cards: insertedCards,
        count: insertedCards?.length ?? 0,
      }),
      {
        status: 201,
        headers,
      }
    );
  } catch (error) {
    console.error("[flashcards/generate] error", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate flashcards" }),
      {
        status: 500,
        headers,
      }
    );
  }
}





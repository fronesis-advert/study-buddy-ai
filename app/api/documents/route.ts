import { NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "Document ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceSupabaseClient();
    const userId = await getCurrentUserId();

    // First check if document exists and user owns it
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check ownership
    if (doc.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: You don't own this document" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Delete the document (chunks will be cascade deleted)
    const { error } = await supabase.from("documents").delete().eq("id", id);

    if (error) {
      console.error("[documents] delete error", error);
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to delete document" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[documents] delete error", error);
    return new Response(JSON.stringify({ error: "Failed to delete document" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(_req: NextRequest) {
  const supabase = getServiceSupabaseClient();
  const userId = await getCurrentUserId();

  // Build query with user filter
  let query = supabase
    .from("documents")
    .select("id, title, source_type, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Filter by user_id - only show user's documents or null (guest) documents
  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.is("user_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[documents] fetch error", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Unable to load documents" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({ documents: data ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

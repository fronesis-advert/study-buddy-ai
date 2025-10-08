import { NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";

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

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, source_type, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

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

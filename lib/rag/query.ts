import { openaiClient } from "@/lib/openai";
import type { Database } from "@/types/database";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";

type FetchRelevantChunksArgs = {
  query: string;
  documentIds?: string[];
  limit?: number;
};

export async function fetchRelevantChunks({
  query,
  documentIds,
  limit = 6,
}: FetchRelevantChunksArgs) {
  if (!query.trim()) return [];

  const response = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: [query],
  });

  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: JSON.stringify(response.data[0].embedding), // Convert to string for pgvector
    match_count: limit,
    doc_ids: documentIds,
  });

  if (error) {
    console.error("match_document_chunks error", error);
    return [];
  }

  return (data ?? []) as Array<{
    id: string;
    document_id: string;
    content: string;
    similarity: number;
  }>;
}


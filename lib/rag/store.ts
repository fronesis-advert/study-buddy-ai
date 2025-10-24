import { createChunkRecords, RawDocument } from "@/lib/rag/chunk";
import { sanitizeText } from "@/lib/rag/extract";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import type { Database } from "@/types/database";

type DocumentSourceType = "upload" | "note" | "link" | string;

export async function ingestDocument({
  userId,
  sessionId,
  title,
  sourceType,
  text,
}: {
  userId: string | null;
  sessionId?: string | null;
  title: string;
  sourceType: DocumentSourceType;
  text: string;
}) {
  const cleaned = sanitizeText(text);
  if (!cleaned) {
    throw new Error("Unable to extract readable text from the provided input.");
  }

  const supabase = getServiceSupabaseClient();

  const documentRecord: RawDocument = {
    userId,
    title,
    sourceType,
    text: cleaned,
  };

  const { documentId, chunks } = await createChunkRecords(documentRecord);

  const { error: documentError } = await supabase.from("documents").insert({
    id: documentId,
    user_id: userId,
    session_id: sessionId,
    title,
    source_type: sourceType,
    raw_text: cleaned,
  });

  if (documentError) {
    throw documentError;
  }

  if (!chunks.length) {
    return {
      documentId,
      chunksPersisted: 0,
    };
  }

  const chunkPayload = chunks.map((chunk) => ({
    id: chunk.id,
    document_id: chunk.document_id,
    content: chunk.content,
    embedding: JSON.stringify(chunk.embedding), // Convert number[] to string for pgvector
    token_count: chunk.token_count,
  })) as Database["public"]["Tables"]["chunks"]["Insert"][];

  const { error: chunkError } = await supabase
    .from("chunks")
    .insert(chunkPayload);

  if (chunkError) {
    throw chunkError;
  }

  return {
    documentId,
    chunksPersisted: chunks.length,
  };
}

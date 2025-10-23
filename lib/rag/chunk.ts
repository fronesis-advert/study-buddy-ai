import { v4 as uuid } from "uuid";
import { embedMany } from "@/lib/rag/embed";

export type RawDocument = {
  id?: string;
  userId?: string | null;
  title?: string;
  sourceType?: "upload" | "url" | "note" | "link" | string;
  text: string;
};

export type TextChunk = {
  id: string;
  document_id: string;
  content: string;
  token_count: number;
};

export type EmbeddedChunk = TextChunk & {
  embedding: number[];
};

export function chunkText(
  text: string,
  {
    maxLength = 800,
    overlap = 200,
  }: { maxLength?: number; overlap?: number } = {}
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxLength) {
      chunks.push(paragraph.trim());
      continue;
    }

    let start = 0;
    while (start < paragraph.length) {
      const end = Math.min(start + maxLength, paragraph.length);
      const chunk = paragraph.slice(start, end).trim();
      if (chunk.length) {
        chunks.push(chunk);
      }
      start += maxLength - overlap;
    }
  }

  return chunks;
}

export async function createChunkRecords(raw: RawDocument) {
  const documentId = raw.id ?? uuid();
  const pieces = chunkText(raw.text);

  const embeddings = await embedMany(pieces);

  return {
    documentId,
    chunks: pieces.map((content, index) => ({
      id: uuid(),
      document_id: documentId,
      content,
      token_count: Math.ceil(content.split(/\s+/).length * 0.75),
      embedding: embeddings[index],
    })),
  };
}

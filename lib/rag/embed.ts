import { openaiClient } from "@/lib/openai";

export async function embedMany(texts: string[]) {
  if (!texts.length) return [];

  const response = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

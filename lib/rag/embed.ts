import { openaiClient } from "@/lib/openai";

export async function embedMany(texts: string[], retries = 3): Promise<number[][]> {
  if (!texts.length) return [];

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await openaiClient.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });

      // Validate response: ensure we got embeddings for all inputs
      if (!response.data || response.data.length !== texts.length) {
        throw new Error(
          `Embedding mismatch: requested ${texts.length} embeddings but got ${response.data?.length ?? 0}`
        );
      }

      // Validate each embedding
      const embeddings = response.data.map((item, index) => {
        if (!item.embedding || item.embedding.length === 0) {
          throw new Error(`Empty embedding returned for text at index ${index}`);
        }
        return item.embedding;
      });

      return embeddings;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      
      if (isLastAttempt) {
        console.error(`Embedding failed after ${retries + 1} attempts:`, error);
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt) * 1000;
      console.warn(`Embedding attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // TypeScript needs this, but we'll never reach here
  throw new Error("Unexpected: embedMany exhausted retries without returning");
}

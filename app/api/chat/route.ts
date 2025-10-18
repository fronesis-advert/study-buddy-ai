import { NextRequest } from "next/server";
import { z } from "zod";
import { streamText, convertToCoreMessages } from "ai";
import { openai } from "@/lib/openai";
import { STUDY_BUDDY_PROMPT } from "@/lib/prompts";
import { fetchRelevantChunks } from "@/lib/rag/query";
import { ensureSession, recordMessage } from "@/lib/sessions";
import { applyRateLimit } from "@/lib/rate-limit";
import { getCurrentUserId } from "@/lib/auth";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  sessionId: z.string().uuid().nullish(),
  documentIds: z.array(z.string().uuid()).optional(),
  mode: z.enum(["chat", "doc"]).default("chat"),
});

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("cf-connecting-ip") ??
    "global";

  const limit = await applyRateLimit(`chat:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!limit.success) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again soon." }),
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(
            (limit.resetAt - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  let parsed;
  try {
    parsed = requestSchema.parse(await req.json());
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid request payload." }),
      { status: 400 }
    );
  }

  const userId = await getCurrentUserId();
  const latestUserMsg = [...parsed.messages]
    .reverse()
    .find((message) => message.role === "user");

  const sessionId = await ensureSession({
    sessionId: parsed.sessionId,
    userId,
    mode: "chat",
    meta: {
      mode: parsed.mode,
      documentIds: parsed.documentIds ?? [],
    },
  });

  if (latestUserMsg) {
    await recordMessage({
      sessionId,
      role: "user",
      content: latestUserMsg.content,
    });
  }

  const shouldRetrieve =
    (parsed.documentIds?.length ?? 0) > 0 || parsed.mode === "doc";

  const contextChunks = shouldRetrieve
    ? await fetchRelevantChunks({
        query: latestUserMsg?.content ?? "",
        documentIds: parsed.documentIds,
      })
    : [];

  const contextText =
    contextChunks.length > 0
      ? contextChunks
          .map(
            (chunk, index) =>
              `[S${index + 1}] (doc ${chunk.document_id}) ${chunk.content}`
          )
          .join("\n\n")
      : "";
  const systemPrompt = contextText
    ? `${STUDY_BUDDY_PROMPT}\n\nUse the provided sources to ground your answer. Cite sources inline using [S#].\n\nSources:\n${contextText}`
    : STUDY_BUDDY_PROMPT;

  const result = await streamText({
    model: openai("gpt-4o-mini") as any,
    system: systemPrompt,
    messages: convertToCoreMessages(parsed.messages),
    temperature: shouldRetrieve ? 0.3 : 0.5,
    maxTokens: 800,
    onFinish: async ({ text }) => {
      if (text.trim().length === 0) return;
      await recordMessage({
        sessionId,
        role: "assistant",
        content: text,
        json:
          contextChunks.length > 0
            ? {
                citations: contextChunks.map((chunk, index) => ({
                  label: `S${index + 1}`,
                  chunkId: chunk.id,
                  documentId: chunk.document_id,
                })),
              }
            : undefined,
      });
    },
  });

  return result.toAIStreamResponse({
    headers: {
      "x-studybuddy-session": sessionId,
    },
  });
}

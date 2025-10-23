
import { NextRequest } from "next/server";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { generateObject } from "ai";
import { openai } from "@/lib/openai";
import { ensureSession } from "@/lib/sessions";
import type { Json } from "@/types/database";
import { fetchRelevantChunks } from "@/lib/rag/query";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { getCurrentUserId } from "@/lib/auth";

const bodySchema = z
  .object({
    topic: z.string().trim().max(200),
    questionCount: z.coerce.number().min(3).max(10).default(5),
    sessionId: z.string().uuid().nullish(),
    documentIds: z.array(z.string().uuid()).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.topic.length === 0 &&
      (!data.documentIds || data.documentIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide a topic or at least one document.",
        path: ["topic"],
      });
    }
  });

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string(),
        prompt: z.string(),
        type: z.enum(["multiple-choice", "short-answer"]),
        options: z.array(z.string()).optional(),
        answer: z.string(),
        explanation: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),
      })
    )
    .max(10),
});

export const runtime = "edge";

export async function POST(req: NextRequest) {
  let parsed;
  try {
    const body = await req.json();
    console.log("Quiz generate request body:", body);
    parsed = bodySchema.parse(body);
  } catch (err) {
    console.error("Quiz validation error:", err);
    return new Response(
      JSON.stringify({
        error: "Invalid quiz request body.",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 400 }
    );
}
  const userId = await getCurrentUserId();
  const supabase = getServiceSupabaseClient();

  const documentIds = parsed.documentIds
    ? Array.from(new Set(parsed.documentIds))
    : [];
  const hasDocuments = documentIds.length > 0;
  const originalTopic = parsed.topic;
  let resolvedTopic = originalTopic;
  let documentTitles: string[] = [];

  if (hasDocuments && resolvedTopic.length === 0) {
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("title")
      .in("id", documentIds);

    if (docsError) {
      console.error("quiz document lookup error", docsError);
    } else if (docs) {
      documentTitles = docs
        .map((doc) => doc.title?.trim())
        .filter((title): title is string => Boolean(title && title.length > 0));

      if (documentTitles.length > 0) {
        resolvedTopic = documentTitles.join(", ");
      }
    }
  }

  const sessionId = await ensureSession({
    sessionId: parsed.sessionId,
    userId,
    mode: "quiz",
    meta: {
      topic: resolvedTopic,
      requestedTopic: originalTopic,
      documentIds,
      documentTitles,
    },
  });

  type RagChunk = Awaited<ReturnType<typeof fetchRelevantChunks>>[number];

  let contextChunks: RagChunk[] = [];

  if (hasDocuments) {
    if (resolvedTopic.length > 0) {
      contextChunks = await fetchRelevantChunks({
        query: resolvedTopic,
        documentIds,
        limit: 8,
      });
    }

    if (contextChunks.length === 0) {
      const { data: fallbackChunks, error: fallbackError } = await supabase
        .from("chunks")
        .select("id, document_id, content")
        .in("document_id", documentIds)
        .order("created_at", { ascending: true })
        .limit(8);

      if (fallbackError) {
        console.error("quiz chunk fallback error", fallbackError);
      } else if (fallbackChunks) {
        contextChunks = fallbackChunks.map((chunk) => ({
          id: chunk.id,
          document_id: chunk.document_id ?? documentIds[0] ?? chunk.id,
          content: chunk.content,
          similarity: 0,
        }));
      }
    }
  }

  const contextText =
    contextChunks.length > 0
      ? contextChunks
          .map((chunk, index) => {
            const docId = chunk.document_id ?? documentIds[0] ?? chunk.id;
            return `[S${index + 1}] ${chunk.content}\n(Document ${docId})`;
          })
          .join("\n\n")
      : "";

  const { object } = await generateObject({
    model: openai("gpt-4o-mini") as any,
    system: `You create adaptive study quizzes with concise, assessable questions. Produce well-structured JSON following the provided schema exactly.`,
    prompt: [
      resolvedTopic.length > 0
        ? `Topic: ${resolvedTopic}`
        : "Topic: Generate a quiz grounded in the selected study documents.",
      documentTitles.length > 0 && originalTopic.length === 0
        ? `Document titles: ${documentTitles.join(", ")}`
        : "",
      `Number of questions: ${parsed.questionCount}`,
      `Difficulty: adaptive based on concepts and bloom-level variety.`,
      contextText ? `Use these sources to tailor content:\n${contextText}` : "",
      `Include a blend of multiple-choice and short-answer questions when appropriate.`,
      `Provide a clear explanation for each answer.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: quizSchema,
  });

  const quizId = uuid();

  const questions = object.questions.map((question) => ({
    ...question,
    id:
      typeof question.id === "string" && question.id.trim().length > 0
        ? question.id
        : uuid(),
    options:
      question.type === "multiple-choice" ? question.options ?? [] : undefined,
  }));

  const { error } = await supabase.from("quizzes").insert({
    id: quizId,
    session_id: sessionId,
    spec: {
      topic: resolvedTopic,
      requestedTopic: originalTopic,
      questionCount: parsed.questionCount,
      documentIds,
      documentTitles,
      generatedAt: new Date().toISOString(),
      questions,
    },
    result: null,
  });

  if (error) {
    console.error("quiz insert error", error);
    return new Response(
      JSON.stringify({ error: "Unable to save quiz." }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({
      sessionId,
      quizId,
      questions,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}



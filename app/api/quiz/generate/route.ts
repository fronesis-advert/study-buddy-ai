
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

const bodySchema = z.object({
  topic: z.string().min(1).max(200),
  questionCount: z.coerce.number().min(3).max(10).default(5),
  sessionId: z.string().uuid().nullish(),
  documentIds: z.array(z.string().uuid()).optional(),
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
  const sessionId = await ensureSession({
    sessionId: parsed.sessionId,
    mode: "quiz",
    meta: {
      topic: parsed.topic,
      documentIds: parsed.documentIds ?? [],
    },
  });

  const contextChunks =
    parsed.documentIds && parsed.documentIds.length > 0
      ? await fetchRelevantChunks({
          query: parsed.topic,
          documentIds: parsed.documentIds,
          limit: 8,
        })
      : [];

  const contextText =
    contextChunks.length > 0
      ? contextChunks
          .map(
            (chunk, index) =>
              `[S${index + 1}] ${chunk.content}\n(Document ${chunk.document_id})`
          )
          .join("\n\n")
      : "";

  const { object } = await generateObject({
    model: openai("gpt-4o-mini") as any,
    system: `You create adaptive study quizzes with concise, assessable questions. Produce well-structured JSON following the provided schema exactly.`,
    prompt: [
      `Topic: ${parsed.topic}`,
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

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.from("quizzes").insert({
    id: quizId,
    session_id: sessionId,
    spec: {
      topic: parsed.topic,
      questionCount: parsed.questionCount,
      documentIds: parsed.documentIds ?? [],
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


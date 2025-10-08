
import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@/lib/openai";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { ensureSession } from "@/lib/sessions";
import type { Json } from "@/types/database";
import { getCurrentUserId } from "@/lib/auth";

const bodySchema = z.object({
  sessionId: z.string().uuid().nullish(),
  quizId: z.string().uuid(),
  answers: z.record(z.string()).default({}),
});

const gradeSchema = z.object({
  score: z.object({
    correct: z.number().int().min(0),
    total: z.number().int().min(1),
  }),
  breakdown: z.array(
    z.object({
      id: z.string(),
      correct: z.boolean(),
      feedback: z.string(),
    })
  ),
});

export const runtime = "edge";

async function getUserId() {
  const supabase = getServiceSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid grade request." }),
      { status: 400 }
    );
  }

  const supabase = getServiceSupabaseClient();
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("id, session_id, spec")
    .eq("id", parsed.quizId)
    .maybeSingle();

  if (error) {
    console.error("quiz lookup failed", error);
    return new Response(
      JSON.stringify({ error: "Quiz not found." }),
      { status: 404 }
    );
  }

  if (!quiz) {
    return new Response(
      JSON.stringify({ error: "Quiz not found." }),
      { status: 404 }
    );
  }

  const spec = quiz.spec as Record<string, unknown>;
  const questions =
    (spec?.questions as Array<Record<string, unknown>>) ?? [];

  if (questions.length === 0) {
    return new Response(
      JSON.stringify({ error: "Quiz template missing questions." }),
      { status: 422 }
    );
  }

  const prompt = questions
    .map((question, index) => {
      const id = String(question.id ?? `q-${index + 1}`);
      const userAnswer = parsed.answers[id] ?? "";
      return [
        `Question ${index + 1} (${question.type ?? "unknown"})`,
        `Prompt: ${question.prompt}`,
        `Expected answer: ${question.answer}`,
        `Explanation: ${question.explanation}`,
        `Learner answer: ${userAnswer || "[no answer provided]"}`,
        `Grade strictly. Mark correct only if the learner answer demonstrates equivalent understanding.`,
      ].join("\n");
    })
    .join("\n\n");

  const { object } = await generateObject({
    model: openai("gpt-4o-mini") as any,
    system:
      "You are an impartial auto-grader. Evaluate each answer independently and return structured JSON according to the schema.",
    prompt,
    schema: gradeSchema,
  });

  const breakdownMap = new Map(
    object.breakdown.map((entry) => [entry.id, entry])
  );

  const normalizedBreakdown = questions.map((question, index) => {
    const id = String(question.id ?? `q-${index + 1}`);
    const entry = breakdownMap.get(id);
    if (entry) return entry;
    return {
      id,
      correct: false,
      feedback: "No evaluation returned. Treat as incorrect.",
    };
  });

  const totalQuestions = normalizedBreakdown.length;
  const correctCount = normalizedBreakdown.filter((item) => item.correct).length;

  const sessionId = await ensureSession({
    sessionId: parsed.sessionId ?? quiz.session_id,
    userId: await getCurrentUserId(),
    mode: "quiz",
  });

  const result = {
    score: {
      correct: Math.max(
        0,
        Math.min(totalQuestions, object.score.correct ?? correctCount)
      ),
      total: totalQuestions,
    },
    breakdown: normalizedBreakdown,
    gradedAt: new Date().toISOString(),
    answers: parsed.answers,
  };

  const { error: updateError } = await supabase
    .from("quizzes")
    .update({ result: result as Json })
    .eq("id", parsed.quizId);

  if (updateError) {
    console.error("quiz update error", updateError);
  }

  return new Response(
    JSON.stringify({ sessionId, result }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { ensureSession, appendSessionMeta } from "@/lib/sessions";
import { getCurrentUserId } from "@/lib/auth";

const bodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  mode: z.enum(["chat", "quiz", "study"]),
  meta: z.record(z.any()).optional(),
});

export const runtime = "edge";

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid session payload." }),
      { status: 400 }
    );
  }

  const userId = await getCurrentUserId();
  const sessionId = await ensureSession({
    sessionId: parsed.sessionId,
    userId,
    mode: parsed.mode,
    meta: parsed.meta ?? {},
  });

  if (parsed.meta && Object.keys(parsed.meta).length > 0) {
    await appendSessionMeta(sessionId, parsed.meta);
  }

  return new Response(
    JSON.stringify({ sessionId }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

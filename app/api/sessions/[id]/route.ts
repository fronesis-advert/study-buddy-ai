
import { NextRequest } from "next/server";
import { z } from "zod";
import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import { appendSessionMeta } from "@/lib/sessions";

const patchSchema = z.object({
  meta: z.record(z.any()),
});

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      `id, user_id, mode, meta, created_at, messages:messages(id, role, content, json, created_at), quizzes:quizzes(id, spec, result, created_at)`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return new Response(
      JSON.stringify({ error: "Session not found." }),
      { status: 404 }
    );
  }

  return new Response(JSON.stringify({ session: data }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let parsed;
  try {
    parsed = patchSchema.parse(await req.json());
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid session metadata." }),
      { status: 400 }
    );
  }

  await appendSessionMeta(params.id, parsed.meta);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

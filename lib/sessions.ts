import { getServiceSupabaseClient } from "@/lib/supabase/service-client";
import type { Json } from "@/types/database";
import { v4 as uuid } from "uuid";

export type SessionMode = "chat" | "quiz" | "study" | "flashcards";
export type MessageRole = "system" | "user" | "assistant";

type EnsureSessionArgs = {
  sessionId?: string | null;
  userId?: string | null;
  mode: SessionMode;
  meta?: Record<string, unknown>;
};

export async function ensureSession({
  sessionId,
  userId = null,
  mode,
  meta = {},
}: EnsureSessionArgs) {
  const supabase = getServiceSupabaseClient();

  if (sessionId) {
    const existing = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .maybeSingle();

    if (existing.data?.id) {
      return existing.data.id;
    }
  }

  const newSessionId = uuid();

  const { error } = await supabase.from("sessions").insert({
    id: newSessionId,
    user_id: userId,
    mode,
    meta: (meta ?? {}) as Json,
  });

  if (error) {
    throw error;
  }

  return newSessionId;
}

export async function recordMessage({
  sessionId,
  role,
  content,
  json,
}: {
  sessionId: string;
  role: MessageRole;
  content: string;
  json?: Record<string, unknown>;
}) {
  const supabase = getServiceSupabaseClient();

  const { error } = await supabase.from("messages").insert({
    session_id: sessionId,
    role,
    content,
    json: json ? (json as Json) : null,
  });

  if (error) {
    throw error;
  }
}

export async function appendSessionMeta(
  sessionId: string,
  meta: Record<string, unknown>
) {
  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("meta")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const current = (data?.meta as Record<string, unknown>) ?? {};
  const nextMeta = { ...current, ...meta };

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ meta: nextMeta as Json })
    .eq("id", sessionId);

  if (updateError) {
    throw updateError;
  }
}

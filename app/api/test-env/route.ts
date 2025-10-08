import { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    const env = getEnv();
    
    return Response.json({
      status: "ok",
      hasOpenAI: !!env.OPENAI_API_KEY,
      hasSupabaseURL: !!env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

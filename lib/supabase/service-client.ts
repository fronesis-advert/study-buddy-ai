import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getEnv } from "@/lib/env";

let cachedServiceClient:
  | ReturnType<typeof createClient<Database>>
  | null = null;

export function getServiceSupabaseClient() {
  if (cachedServiceClient) {
    return cachedServiceClient;
  }

  const {
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = getEnv();

  cachedServiceClient = createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'cache-control': 'no-cache',
        },
      },
    }
  );

  return cachedServiceClient;
}

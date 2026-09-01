import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function instantiateAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Service-role client that bypasses RLS. Server-only, and only for trusted
// contexts with no user session to scope a request to (e.g. webhooks).
let client: ReturnType<typeof instantiateAdminClient> | undefined;

export function createAdminClient() {
  if (!client) {
    client = instantiateAdminClient();
  }
  return client;
}

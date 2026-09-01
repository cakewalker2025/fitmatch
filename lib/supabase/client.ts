import { createBrowserClient } from "@supabase/ssr";

function instantiateClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

let client: ReturnType<typeof instantiateClient> | undefined;

export function createClient() {
  if (!client) {
    client = instantiateClient();
  }
  return client;
}

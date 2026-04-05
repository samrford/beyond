import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (singleton pattern).
 * Safe to use in any Client Component.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

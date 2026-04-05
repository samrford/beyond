import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Auth callback route handler.
 * Exchanges Supabase auth codes for sessions.
 * Handles OAuth provider callbacks, email confirmations, and password reset links.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to login with error if auth code exchange fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

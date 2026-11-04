import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, fetchGoogleEmail } from "@/lib/google/oauth";

const STATE_COOKIE = "gmail_oauth_state";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/?gmail_error=${reason}`);

  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const redirectUri = new URL("/api/gmail/callback", request.url).toString();
    const tokens = await exchangeCodeForTokens({ code, redirectUri });

    if (!tokens.refresh_token) {
      // Happens if the user had already granted consent and Google didn't
      // re-issue a refresh token. prompt=consent on /connect should prevent
      // this, but guard anyway rather than silently storing a connection
      // that can't be refreshed later.
      return fail("no_refresh_token");
    }

    const email = await fetchGoogleEmail(tokens.access_token);

    const admin = createAdminClient();
    const { error } = await admin
      .from("gmail_connections")
      .upsert(
        {
          user_id: user.id,
          email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) {
      console.error("Failed to store gmail_connections row:", error.message);
      return fail("storage_failed");
    }

    const response = NextResponse.redirect(`${origin}/`);
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("Gmail OAuth callback failed:", err);
    return fail("exchange_failed");
  }
}

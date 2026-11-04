import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";

const STATE_COOKIE = "gmail_oauth_state";

// Starts the Gmail OAuth flow. Requires an existing app login — Gmail
// access is layered on top of a session, never a way to create one.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = new URL("/api/gmail/callback", request.url).toString();
  const authUrl = buildGoogleAuthUrl({ redirectUri, state });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes is plenty for a consent screen
    path: "/",
  });
  return response;
}

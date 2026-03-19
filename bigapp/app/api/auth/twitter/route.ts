import { NextResponse } from "next/server";

export async function GET() {
  // Public OAuth endpoint for Twitter (X) - OAuth 2.0
  const CLIENT_ID = process.env.TWITTER_CLIENT_ID || "YOUR_CLIENT_ID";
  const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/twitter/callback`;
  const SCOPE = "tweet.read users.read offline.access";
  const STATE = "state"; // Ideally generate a random string
  const CODE_CHALLENGE = "challenge"; // For PKCE

  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPE)}&state=${STATE}&code_challenge=${CODE_CHALLENGE}&code_challenge_method=plain`;

  return NextResponse.redirect(authUrl);
}

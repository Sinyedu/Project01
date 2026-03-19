import { NextResponse } from "next/server";

export async function GET() {
  // Public OAuth endpoint for Facebook
  const CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || "YOUR_CLIENT_ID";
  const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/facebook/callback`;
  const SCOPE = "email,public_profile";

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPE}&response_type=code`;

  return NextResponse.redirect(authUrl);
}

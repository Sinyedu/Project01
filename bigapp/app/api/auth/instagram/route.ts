import { NextResponse } from "next/server";

export async function GET() {
  // Public OAuth endpoint for Instagram (using the Instagram Basic Display API or similar)
  // We'll use a placeholder for CLIENT_ID and REDIRECT_URI
  const CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID || "YOUR_CLIENT_ID";
  const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/instagram/callback`;
  const SCOPE = "user_profile,user_media";

  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPE}&response_type=code`;

  return NextResponse.redirect(authUrl);
}

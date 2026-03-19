import { NextResponse } from "next/server";

export async function GET() {
  // Public OAuth endpoint for TikTok
  const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || "YOUR_CLIENT_KEY";
  const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/tiktok/callback`;
  const SCOPE = "user.info.basic,video.list";

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${CLIENT_KEY}&scope=${SCOPE}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  return NextResponse.redirect(authUrl);
}

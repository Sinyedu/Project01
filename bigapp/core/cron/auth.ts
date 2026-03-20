import { NextRequest, NextResponse } from "next/server";

export function verifyCron(req: NextRequest): NextResponse | null {
  // Simple check for CRON_SECRET or development environment
  if (process.env.NODE_ENV === "development") return null;
  
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

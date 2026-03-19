import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Clerk external accounts are already available on the user object
  const externalAccounts = user.externalAccounts;

  return NextResponse.json({
    userId: user.id,
    externalAccounts: externalAccounts.map((acc) => ({
      id: acc.id,
      provider: acc.provider, // e.g., 'google', 'facebook', 'instagram'
      username: acc.username,
      emailAddress: acc.emailAddress,
      avatarUrl: acc.imageUrl,
      verificationStatus: acc.verification?.status,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId } = (await req.json()) as { accountId: string };
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    await client.users.deleteExternalAccount(userId, accountId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

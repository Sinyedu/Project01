"use client";

import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export function Navbar() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-surface-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-12">
        <Link href="/" className="font-serif text-xl tracking-tight text-foreground">
          Tomorrow’s Archive
        </Link>

        <div className="flex items-center gap-8">
          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/vault"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground"
              >
                The Vault
              </Link>
              <Link
                href="/dashboard/archive"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground"
              >
                Preserve
              </Link>
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-7 h-7 border border-surface-border"
                  }
                }}
              />
            </>
          ) : isLoaded ? (
            <>
              <Link
                href="/principles"
                className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground md:block"
              >
                Principles
              </Link>
              <SignInButton mode="modal">
                <button className="archive-button text-[10px]">
                  Enter Archive
                </button>
              </SignInButton>
            </>
          ) : (
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-border" />
          )}
        </div>
      </div>
    </nav>
  );
}

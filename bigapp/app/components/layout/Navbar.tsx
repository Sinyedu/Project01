import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <nav className="animate-slide-down fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="/" className="text-lg font-bold tracking-tight">
          <span className="gradient-text">BigApp</span>
        </a>

        <div className="flex items-center gap-3">
          <a
            href="#platforms"
            className="hidden text-sm text-muted transition-colors hover:text-foreground sm:block"
          >
            Platforms
          </a>
          <a
            href="#features"
            className="hidden text-sm text-muted transition-colors hover:text-foreground sm:block"
          >
            Features
          </a>
          <a
            href="#capture"
            className="hidden text-sm text-muted transition-colors hover:text-foreground sm:block"
          >
            Capture
          </a>
          <Show when="signed-in">
            <a
              href="/dashboard"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              Dashboard
            </a>
          </Show>

          <div className="ml-4 flex items-center gap-3">
            <Show when="signed-out">
              <SignInButton>
                <button className="cursor-pointer text-sm text-muted transition-colors hover:text-foreground">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400">
                  Get started
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
      </div>
    </nav>
  );
}

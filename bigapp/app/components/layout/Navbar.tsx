import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <nav className="animate-slide-down fixed inset-x-0 top-0 z-50 border-b border-border/20 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="/" className="text-sm font-black tracking-tighter uppercase">
          BigApp
        </a>

        <div className="flex items-center gap-6">
          <Show when="signed-in">
            <a
              href="/search"
              className="text-[10px] font-bold uppercase tracking-widest text-muted transition-colors hover:text-white"
            >
              Search
            </a>
            <a
              href="/moments"
              className="text-[10px] font-bold uppercase tracking-widest text-muted transition-colors hover:text-white"
            >
              Moments
            </a>
            <a
              href="/dashboard"
              className="text-[10px] font-bold uppercase tracking-widest text-muted transition-colors hover:text-white"
            >
              Vault
            </a>
          </Show>

          <div className="flex items-center gap-4">
            <Show when="signed-out">
              <SignInButton>
                <button className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-muted hover:text-white transition-colors">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-black transition-transform hover:scale-105">
                  Join
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

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface/30 px-6 py-16 md:px-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-12 md:flex-row md:items-center md:gap-4">
        <div className="space-y-2">
          <p className="font-serif text-lg tracking-tight text-foreground">
            Tomorrow’s Archive
          </p>
          <p className="text-[11px] font-medium leading-relaxed text-muted-foreground max-w-xs">
            A modern archival system for individuals, families, and communities to preserve their digital lives for the next century.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-x-12 gap-y-6">
          <div className="space-y-4">
            <p className="archive-label">Product</p>
            <ul className="space-y-2 text-[11px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
              <li><a href="/dashboard">The Vault</a></li>
              <li><a href="/dashboard/archive">Preserve</a></li>
              <li><a href="/principles">Archival Principles</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <p className="archive-label">Legal</p>
            <ul className="space-y-2 text-[11px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Archive</a></li>
              <li><a href="/integrity">Data Integrity</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mx-auto mt-24 flex max-w-7xl items-center justify-between border-t border-surface-border/50 pt-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          &copy; 2026 Tomorrow&apos;s Archive &mdash; Lived Experience Hackathon
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          Built to Last 100 Years
        </span>
      </div>
    </footer>
  );
}

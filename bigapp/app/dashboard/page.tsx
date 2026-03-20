"use client";

import { Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { platformConfigs } from "@/core/config/platforms";
import { PlatformIcon, SearchIcon, ArchiveIcon, ShieldIcon, CheckIcon } from "@/app/components/ui/Icons";

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [archives, setArchives] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/archives")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setArchives(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isLoaded, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // Grouping logic for the timeline (simplified for the demo)
  const capsules = archives.length > 0 ? [
    { id: "1", title: "March 2026", count: 12, status: "Verified", date: "Present" },
    { id: "2", title: "February 2026", count: 45, status: "Verified", date: "1 month ago" },
    { id: "3", title: "January 2026", count: 128, status: "Verified", date: "2 months ago" },
  ] : [];

  return (
    <div className="mx-auto max-w-7xl px-6 pt-16 pb-32 md:px-12">
      <header className="mb-24 flex flex-col items-start justify-between gap-12 lg:flex-row lg:items-end">
        <div className="space-y-4">
          <p className="archive-label">Welcome Back, {user?.firstName || "Archiver"}</p>
          <h1 className="font-serif text-5xl tracking-tight text-foreground md:text-6xl">
            The Vault
          </h1>
          <p className="text-[13px] font-medium text-muted-foreground max-w-md leading-relaxed">
            Your lived experience, structured and preserved with bit-level integrity for the long term.
          </p>
        </div>
        
        <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-auto">
          <Link 
            href="/dashboard/archive" 
            className="archive-button flex items-center justify-center gap-3"
          >
            <ArchiveIcon className="h-4 w-4" />
            Preserve New Media
          </Link>
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-surface-border bg-surface/50 py-3.5 pl-12 pr-6 text-xs text-foreground outline-none ring-accent/20 transition-all focus:bg-surface focus:ring-4 sm:w-64"
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted transition-colors group-focus-within:text-accent" />
          </form>
        </div>
      </header>

      <div className="grid gap-20 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <section className="space-y-12">
            <div className="flex items-center justify-between border-b border-surface-border pb-6">
              <h2 className="archive-label text-foreground">Archival Timeline</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {archives.length} Objects Preserved
              </span>
            </div>

            {archives.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center archive-card">
                <p className="mb-8 font-serif text-2xl text-muted-foreground">Your vault is currently empty.</p>
                <Link href="/dashboard/archive" className="archive-button">
                  Start Your First Capsule
                </Link>
              </div>
            ) : (
              <div className="relative space-y-12 pl-8 md:pl-12">
                {/* The Thread */}
                <div className="absolute left-[3px] top-4 bottom-4 w-px bg-surface-border md:left-[5px]" />
                
                {capsules.map((capsule) => (
                  <div key={capsule.id} className="relative">
                    {/* Thread Node */}
                    <div className="absolute -left-[33px] top-2 h-2 w-2 rounded-full border-2 border-background bg-accent md:-left-[42px]" />
                    
                    <Link href={`/vault/capsule/${capsule.id}`} className="block group">
                        <div className="archive-card">
                            <div className="mb-6 flex items-start justify-between">
                                <div>
                                    <p className="archive-label text-accent mb-1">{capsule.date}</p>
                                    <h3 className="font-serif text-3xl text-foreground group-hover:text-accent transition-colors">{capsule.title}</h3>
                                </div>
                                <div className="flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1">
                                    <CheckIcon className="h-3 w-3 text-accent" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent">Verified</span>
                                </div>
                            </div>
                            
                            {/* Mini Thumbnail Grid */}
                            <div className="grid grid-cols-4 gap-3">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="aspect-square rounded-lg bg-surface-border/30 animate-pulse" />
                                ))}
                            </div>
                            
                            <div className="mt-6 flex items-center justify-between border-t border-surface-border/50 pt-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {capsule.count} Digital Objects
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted transition-colors group-hover:text-foreground">
                                    View Capsule →
                                </span>
                            </div>
                        </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-16">
          <section className="space-y-8">
            <h2 className="archive-label text-foreground">Integrity Monitor</h2>
            <div className="archive-card space-y-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <ShieldIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-foreground">Archive Health</p>
                        <p className="text-[10px] font-bold text-accent uppercase">All Bitstreams Healthy</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-muted-foreground">Last Integrity Scan</span>
                        <span className="text-foreground">2 hours ago</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border/30">
                        <div className="h-full w-full bg-accent" />
                    </div>
                </div>
            </div>
          </section>

          <section className="space-y-8">
            <h2 className="archive-label text-foreground">Official Sources</h2>
            <div className="space-y-3">
              {Object.entries(platformConfigs).map(([key, platform]) => (
                <button
                  key={key}
                  onClick={() => router.push(`/dashboard/import/${key}`)}
                  className="flex w-full items-center justify-between group rounded-2xl border border-surface-border/50 bg-surface/20 p-4 transition-all hover:bg-surface/50 hover:border-surface-border"
                >
                  <div className="flex items-center gap-4">
                    <PlatformIcon platform={key} className="h-5 w-5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                    <span className="text-[11px] font-bold text-muted group-hover:text-foreground transition-colors uppercase tracking-widest">{platform.name}</span>
                  </div>
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Import</span>
                </button>
              ))}
            </div>
          </section>

          <div className="rounded-2xl border border-surface-border bg-surface/30 p-8">
             <p className="archive-label mb-4">The Preservation Philosophy</p>
             <p className="text-[12px] font-medium leading-relaxed text-muted-foreground">
               Archives are not just files. They are structured records of lived experience, built to survive the evolution of hardware and the decay of software.
             </p>
             <Link href="/principles" className="mt-6 block text-[10px] font-black uppercase tracking-widest text-accent hover:underline">
               Read our principles →
             </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

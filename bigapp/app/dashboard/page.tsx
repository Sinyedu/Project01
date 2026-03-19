"use client";

import { Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { platformConfigs } from "@/core/config/platforms";
import { PlatformIcon, SearchIcon, ArchiveIcon, ShieldIcon } from "@/app/components/ui/Icons";

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [archives, setArchives] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      setMessage({ type: 'success', text: `Successfully connected ${success.split('_')[0]}!` });
    } else if (error) {
      setMessage({ type: 'error', text: "Authentication failed. Please try again." });
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoaded && user) {
      setConnections(user.externalAccounts || []);
      
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

  const handleAddAccount = (provider: string) => {
    const manualPlatforms = ['instagram', 'facebook', 'twitter', 'tiktok'];
    if (manualPlatforms.includes(provider)) {
      window.location.href = `/api/auth/${provider}`;
    } else {
      window.location.href = `https://accounts.clerk.com/user-profile/connected-accounts`;
    }
  };

  const isConnected = (provider: string) => {
    return connections.some((acc) => acc.provider.includes(provider));
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 pt-24 pb-20">
      {message && (
        <div className={`mb-8 animate-fade-in rounded-2xl p-4 text-sm font-bold ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      <header className="mb-20 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="mb-1 text-4xl font-black text-white tracking-tighter uppercase">Vault</h1>
          <p className="text-sm text-muted font-medium">
            Welcome back, <span className="text-white">{user?.firstName || "Archiver"}</span>.
          </p>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search vault..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-border/60 bg-surface py-3 pl-12 pr-4 text-xs text-white outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all placeholder:text-muted/40"
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted/40" />
        </form>
      </header>

      {/* Stats - Minimal Horizontal */}
      <div className="mb-24 flex flex-wrap gap-16 border-b border-border/10 pb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            <ArchiveIcon className="h-3 w-3" />
            <span>Preserved</span>
          </div>
          <p className="text-3xl font-black text-white leading-none">{archives.length}</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            <PlatformIcon platform="generic" className="h-3 w-3" />
            <span>Connectors</span>
          </div>
          <p className="text-3xl font-black text-white leading-none">{Object.keys(platformConfigs).filter(isConnected).length}</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            <ShieldIcon className="h-3 w-3" />
            <span>Integrity</span>
          </div>
          <p className="text-3xl font-black text-emerald-500 leading-none">99.9%</p>
        </div>
      </div>

      <div className="grid gap-20 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section>
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Recent Captures</h2>
              <Link href="/search" className="text-[10px] font-bold text-muted hover:text-white transition-colors uppercase tracking-widest">
                All Archives →
              </Link>
            </div>

            {archives.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="mb-8 text-sm text-muted">Your vault is currently empty.</p>
                <a
                  href="/#capture"
                  className="rounded-full bg-white px-8 py-3 text-[10px] font-black text-black uppercase tracking-widest transition-transform hover:scale-105"
                >
                  Capture
                </a>
              </div>
            ) : (
              <div className="divide-y divide-border/10">
                {archives.map((archive) => {
                   const platform = archive.platform || 'unknown';
                   const cfg = platformConfigs[platform as keyof typeof platformConfigs];
                   const displayTitle = archive.title || archive.url || archive.data?.title || archive.data?.text?.slice(0, 60);
                   const date = archive.sourceTimestamp || archive.createdAt;
                   const formattedDate = date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-';
                   
                   return (
                    <Link
                      key={archive._id?.toString() || Math.random().toString()}
                      href={`/details/${archive._id}`}
                      className="group flex items-center justify-between py-8 transition-all hover:px-4 -mx-4 rounded-2xl hover:bg-surface/50"
                    >
                      <div className="flex items-center gap-6 overflow-hidden">
                        <div 
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface border border-border/40"
                          style={{ color: cfg?.color || '#333' }}
                        >
                          <PlatformIcon platform={platform} className="h-5 w-5" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="text-base font-bold text-white group-hover:text-accent transition-colors truncate">
                            {displayTitle}
                          </h3>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                            <span style={{ color: cfg?.color }}>{platform}</span>
                            <span>·</span>
                            <span>{formattedDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted/40 group-hover:text-white transition-colors">
                        Details
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-16">
          <section>
            <h2 className="mb-8 text-[10px] font-black text-muted uppercase tracking-[0.3em]">Connectors</h2>
            <div className="space-y-4">
              {Object.entries(platformConfigs).map(([key, platform]) => {
                const connected = isConnected(key);
                return (
                  <div key={key} className="flex items-center justify-between group bg-surface/30 p-4 rounded-2xl border border-transparent hover:border-border/40 transition-all">
                    <div className="flex items-center gap-4">
                      <PlatformIcon platform={key} className={`h-5 w-5 ${connected ? '' : 'grayscale opacity-30'}`} style={{ color: connected ? platform.color : undefined }} />
                      <div>
                        <p className="text-[11px] font-bold text-white transition-colors">{platform.name}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${connected ? 'text-emerald-500' : 'text-muted/40'}`}>
                          {connected ? 'Active' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddAccount(key)}
                      className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                        connected ? "text-muted/40 hover:text-white" : "text-accent/60 hover:text-accent"
                      }`}
                    >
                      {connected ? "Manage" : "Connect"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="space-y-4 pt-12 border-t border-border/10">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Auto-Archive</h3>
            <p className="text-[11px] leading-relaxed text-muted font-medium">
              Daily captures are currently <span className="text-emerald-500">enabled</span> for all connected accounts.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

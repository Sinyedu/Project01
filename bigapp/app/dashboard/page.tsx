"use client";

import { Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { platformConfigs } from "@/core/config/platforms";

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] items-center justify-center">
        <p className="animate-pulse text-muted">Loading your dashboard...</p>
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [archives, setArchives] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
      
      // Fetch user's recent archives
      fetch("/api/archives")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setArchives(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isLoaded, user]);

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="animate-pulse text-muted">Loading your dashboard...</p>
      </div>
    );
  }

  const handleAddAccount = (provider: string) => {
    const manualPlatforms = ['instagram', 'facebook', 'twitter', 'tiktok'];
    
    if (manualPlatforms.includes(provider)) {
      // Use our custom public API redirect
      window.location.href = `/api/auth/${provider}`;
    } else {
      // Fallback to Clerk for other platforms
      window.location.href = `https://accounts.clerk.com/user-profile/connected-accounts`;
    }
  };

  const isConnected = (provider: string) => {
    // Check both Clerk connections and our future local DB connections (placeholder check for now)
    return connections.some((acc) => acc.provider.includes(provider));
  };

  return (
    <div className="mx-auto max-w-4xl p-6 pt-24">
      {message && (
        <div className={`mb-6 rounded-xl p-4 text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      <header className="mb-12 text-center sm:text-left">
        <h1 className="mb-2 text-4xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-lg text-muted">
          Welcome back, <span className="text-accent">{user?.firstName || "Archiver"}</span>.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="mb-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Recent Archives</h2>
              <a href="/#capture" className="text-sm font-medium text-accent hover:underline">
                + Archive New
              </a>
            </div>

            {archives.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center bg-card/10">
                <p className="mb-6 text-muted">Your archive is empty.</p>
                <a
                  href="/#capture"
                  className="rounded-full bg-border/50 px-8 py-3 text-sm font-semibold transition-all hover:bg-muted"
                >
                  Start Archiving
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {archives.map((archive) => (
                  <div
                    key={archive._id}
                    className="group relative flex items-center justify-between rounded-xl border border-border bg-card/30 p-4 transition-all hover:border-muted hover:bg-card/50"
                  >
                    <div className="flex flex-col gap-1">
                      <h3 className="font-medium text-white group-hover:text-accent transition-colors truncate max-w-md">
                        {archive.title || archive.url}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded bg-border/50">
                          {archive.platform}
                        </span>
                        <span>•</span>
                        <span>{new Date(archive.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-emerald-500 font-medium">{archive.status}</span>
                      </div>
                    </div>
                    <Link
                      href={`/details/${archive._id}`}
                      className="rounded-lg border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-white transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="mb-6 text-xl font-semibold text-white">Connections</h2>
            <div className="space-y-3">
              {Object.entries(platformConfigs).map(([key, platform]) => {
                const connected = isConnected(key);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/20 p-3 transition-all hover:border-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                        style={{ backgroundColor: `${platform.color}20`, color: platform.color }}
                      >
                        {platform.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{platform.name}</p>
                        <p className="text-[10px] text-muted">
                          {connected ? "Active" : "Disconnected"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddAccount(key)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                        connected
                          ? "bg-border/50 text-muted hover:bg-muted hover:text-white"
                          : "bg-accent text-black hover:bg-amber-400"
                      }`}
                    >
                      {connected ? "Manage" : "Connect"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] p-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-500">Manual Auth</h3>
            <p className="text-[11px] leading-relaxed text-muted/80">
              We now use public OAuth endpoints for social media logins to ensure maximum compatibility and direct platform access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

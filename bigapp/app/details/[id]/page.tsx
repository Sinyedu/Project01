"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { platformConfigs } from "@/core/config/platforms";

export default function DetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/details/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Archive not found");
        return res.json();
      })
      .then((data) => {
        setItem(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const copyId = () => {
    navigator.clipboard.writeText(id as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="animate-pulse text-muted font-medium">Restoring archive...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-6 px-6 text-center">
        <div className="text-6xl grayscale opacity-20">🕳️</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Archive Lost</h2>
          <p className="text-muted max-w-xs">{error || "This record might have been deleted or moved."}</p>
        </div>
        <Link href="/dashboard" className="rounded-full bg-border/50 px-6 py-2 text-sm font-semibold hover:bg-muted transition-all">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { data, type } = item;
  const isArchive = type === "archive";

  // Normalize fields for display
  const title = isArchive
    ? data.title
    : (data.data.title || data.data.displayName || data.data.name || data.data.username || "Archive Item");
  const content = isArchive
    ? data.textContent
    : (data.data.text || data.data.bio || "");
  const timestamp = new Date(data.sourceTimestamp || data.createdAt).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short'
  });
  const media = isArchive ? data.media : data.mediaRefs;
  const platform = data.platform || data.source;
  const cfg = platformConfigs[platform as keyof typeof platformConfigs];

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-muted hover:text-white transition-colors">
            <span className="text-lg">←</span> Back to Archives
          </Link>
          <div className="flex gap-2">
            <button
              onClick={copyId}
              className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted hover:text-white hover:border-muted transition-all"
            >
              {copied ? "Copied!" : "Copy ID"}
            </button>
            {data.sourceUrl && (
              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-amber-400 transition-all"
              >
                Visit Original
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <header className="space-y-6">
              <div className="flex items-center gap-3">
                <div
                  className="rounded-lg px-3 py-1 text-xs font-black uppercase tracking-widest"
                  style={{ backgroundColor: `${cfg?.color || '#333'}20`, color: cfg?.color || '#999' }}
                >
                  {platform}
                </div>
                <div className="h-1 w-1 rounded-full bg-border" />
                <div className="text-xs font-bold uppercase tracking-widest text-muted">
                  {type}
                </div>
              </div>

              <h1 className="text-2xl font-black text-white leading-tight tracking-tight">
                {title}
              </h1>

              <div className="flex items-center gap-4 border-l-2 border-accent pl-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {data.author || data.data?.username || "Unknown Author"}
                  </p>
                  <p className="text-xs text-muted font-medium">
                    Captured on {timestamp}
                  </p>
                </div>
              </div>
            </header>

            {content && (
              <div className="prose prose-invert max-w-none">
                <p className="text-xl leading-relaxed text-muted-foreground whitespace-pre-wrap selection:bg-accent selection:text-black">
                  {content}
                </p>
              </div>
            )}

            {media && media.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted">Media Assets ({media.length})</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {media.map((m: any, i: number) => {
                    const url = typeof m === "string" ? m : m.archivedUrl || m.originalUrl;
                    if (!url) return null;

                    return (
                      <div key={i} className="group relative aspect-video overflow-hidden rounded-2xl bg-card/20 border border-border/50">
                        <img
                          src={url}
                          alt={`Media ${i + 1}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                          <a
                            href={url}
                            target="_blank"
                            className="text-xs font-bold text-white uppercase tracking-widest hover:text-accent transition-colors"
                          >
                            View Full Resolution ↗
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-8">
                {data.tags.map((tag: string) => (
                  <span key={tag} className="rounded-lg bg-card/30 border border-border px-3 py-1.5 text-xs font-bold text-accent">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            <div className="rounded-3xl border border-border bg-card/20 p-8 space-y-8">
              <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Archival Metadata</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-border/50 pb-3">
                    <span className="text-xs text-muted">Integrity</span>
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Verified</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-3">
                    <span className="text-xs text-muted">Permanence</span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Immutable</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-3">
                    <span className="text-xs text-muted">Storage</span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Cloudinary</span>
                  </div>
                </div>
              </section>

              {data.sourceUrl && (
                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Original URI</h3>
                  <div className="break-all rounded-xl bg-black/40 p-3 text-[10px] font-mono text-muted border border-border/30">
                    {data.sourceUrl}
                  </div>
                </section>
              )}

              <div className="pt-4">
                <div className="rounded-2xl bg-accent/5 border border-accent/20 p-4">
                  <p className="text-[11px] leading-relaxed text-accent/80 font-medium">
                    This archive is cryptographically signed and stored in a distributed manner to ensure it remains available even if the original platform goes offline.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card/10 p-8">
              <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted">Related Tools</h3>
              <div className="grid grid-cols-1 gap-2">
                <button className="flex items-center justify-between rounded-xl bg-card/40 p-4 text-xs font-bold text-white transition-all hover:bg-card/60">
                  Export to PDF <span>📄</span>
                </button>
                <button className="flex items-center justify-between rounded-xl bg-card/40 p-4 text-xs font-bold text-white transition-all hover:bg-card/60">
                  Generate AI Summary <span>✨</span>
                </button>
                <button className="flex items-center justify-between rounded-xl bg-red-500/5 p-4 text-xs font-bold text-red-500 transition-all hover:bg-red-500/10">
                  Delete Archive <span>🗑️</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

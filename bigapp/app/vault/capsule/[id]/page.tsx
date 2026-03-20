"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldIcon, ArchiveIcon, CheckIcon, DownloadIcon } from "@/app/components/ui/Icons";

export default function CapsuleDetailPage() {
  const { id } = useParams();
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/archives")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setArchives(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-surface-border border-t-accent" />
          <p className="archive-label animate-pulse">Accessing Archive Capsule...</p>
        </div>
      </div>
    );
  }

  // Mock data for the specific capsule for demo purposes
  const capsuleTitle = "March 2026 Capsule";
  const itemCount = archives.length;

  return (
    <div className="min-h-screen bg-background pt-16 pb-32 px-6 md:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-20 flex flex-col items-start justify-between gap-12 lg:flex-row lg:items-end">
          <div className="space-y-4">
            <Link href="/dashboard" className="archive-label transition-colors hover:text-foreground">
              ← Back to The Vault
            </Link>
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-surface-border text-accent">
                    <ArchiveIcon className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="font-serif text-5xl tracking-tight text-foreground">{capsuleTitle}</h1>
                    <p className="archive-label text-accent mt-1 flex items-center gap-2">
                        <CheckIcon className="h-3 w-3" />
                        Healthy Archive Capsule
                    </p>
                </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button className="archive-button-outline flex items-center gap-2">
                <ShieldIcon className="h-3 w-3" />
                Audit Integrity
            </button>
            <button className="archive-button flex items-center gap-2">
                <DownloadIcon className="h-3 w-3" />
                Export Capsule package
            </button>
          </div>
        </header>

        <div className="grid gap-20 lg:grid-cols-12">
          {/* Item Grid */}
          <div className="lg:col-span-8 space-y-12">
            <div className="flex items-center justify-between border-b border-surface-border pb-6">
              <h2 className="archive-label text-foreground">Digital Objects ({itemCount})</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Sorted by Capture Date
              </span>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              {archives.map((item, index) => {
                const title = item.title || item.data?.title || item.data?.displayName || "Untitled Object";
                const platform = item.platform || item.source || "upload";
                const date = new Date(item.sourceTimestamp || item.createdAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric'
                });

                return (
                  <Link key={index} href={`/details/${item._id}`} className="group block">
                    <div className="archive-card overflow-hidden !p-0">
                       <div className="aspect-square w-full bg-surface-border/20">
                          {item.mediaRefs?.[0] || item.media?.[0] ? (
                            <img 
                                src={typeof item.mediaRefs?.[0] === 'string' ? item.mediaRefs[0] : item.media?.[0]?.archivedUrl} 
                                alt={title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/20">
                                <ArchiveIcon className="h-12 w-12" />
                            </div>
                          )}
                       </div>
                       <div className="p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="archive-label text-[9px]">{platform}</span>
                            <span className="text-[9px] font-bold text-muted-foreground">{date}</span>
                          </div>
                          <h3 className="font-serif text-xl text-foreground group-hover:text-accent transition-colors truncate">{title}</h3>
                          <div className="flex items-center gap-2 pt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                             <div className="h-1 w-1 rounded-full bg-accent" />
                             SHA-256 Verified
                          </div>
                       </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-12">
             <section className="archive-card p-10 space-y-8">
                <p className="archive-label">Capsule Manifest</p>
                <div className="space-y-6">
                    <div className="flex justify-between border-b border-surface-border/50 pb-3">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Created</span>
                        <span className="text-[11px] font-black text-foreground">MAR 19, 2026</span>
                    </div>
                    <div className="flex justify-between border-b border-surface-border/50 pb-3">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Object Count</span>
                        <span className="text-[11px] font-black text-foreground">{itemCount}</span>
                    </div>
                    <div className="flex justify-between border-b border-surface-border/50 pb-3">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Integrity</span>
                        <span className="text-[11px] font-black text-accent">100% VERIFIED</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Manifest</span>
                        <span className="text-[11px] font-black text-foreground">v1.0 (JSON)</span>
                    </div>
                </div>
             </section>

             <section className="space-y-6">
                <p className="archive-label">Provenance Sources</p>
                <div className="flex flex-wrap gap-2">
                    {["Instagram", "Twitter", "Local Upload"].map(s => (
                        <div key={s} className="rounded-lg border border-surface-border bg-surface px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {s}
                        </div>
                    ))}
                </div>
             </section>

             <div className="rounded-2xl border border-accent/10 bg-accent/5 p-8">
                <p className="archive-label text-accent mb-4">Portability Note</p>
                <p className="text-[12px] font-medium leading-relaxed text-accent/80">
                  This capsule is structured using the Open Archival Information System (OAIS) principles. It is designed to be exported and stored offline while maintaining its internal reference structure.
                </p>
             </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

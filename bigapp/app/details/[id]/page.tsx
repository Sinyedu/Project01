"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { platformConfigs } from "@/core/config/platforms";
import { ShieldIcon, ArchiveIcon, CheckIcon, DownloadIcon } from "@/app/components/ui/Icons";

export default function DetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/details/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Object not found in vault");
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

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-surface-border border-t-accent" />
          <p className="archive-label animate-pulse">Restoring Digital Object...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center bg-background gap-8 px-6 text-center">
        <div className="text-6xl grayscale opacity-20">🕳️</div>
        <div className="space-y-4">
          <h2 className="font-serif text-3xl text-foreground">Object Not Found</h2>
          <p className="text-muted-foreground max-w-xs mx-auto">This archival record may have been moved or the integrity of its reference has been lost.</p>
        </div>
        <Link href="/dashboard" className="archive-button-outline">
          Return to Vault
        </Link>
      </div>
    );
  }

  const { data, type } = item;
  const isArchive = type === "archive";

  // Normalize fields
  const title = isArchive
    ? data.title
    : (data.data.title || data.data.displayName || data.data.name || data.data.username || "Untitled Object");
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
  const checksum = data.checksum || "Pending Verification";

  return (
    <div className="min-h-screen bg-background pt-16 pb-32 px-6 md:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-16 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-4">
            <Link href="/dashboard" className="archive-label transition-colors hover:text-foreground">
              ← Back to The Vault
            </Link>
            <div className="flex items-center gap-3">
               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-surface-border" style={{ color: cfg?.color }}>
                  <ArchiveIcon className="h-5 w-5" />
               </div>
               <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">
                {title}
               </h1>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button className="archive-button-outline flex items-center gap-2">
                <ShieldIcon className="h-3 w-3" />
                Verify Integrity
            </button>
            <button className="archive-button flex items-center gap-2">
                <DownloadIcon className="h-3 w-3" />
                Export Object
            </button>
          </div>
        </header>

        <div className="grid gap-20 lg:grid-cols-12">
          {/* Object Display */}
          <div className="lg:col-span-8 space-y-16">
            {media && media.length > 0 && (
              <div className="space-y-6">
                 <div className="grid gap-6">
                  {media.map((m: any, i: number) => {
                    const url = typeof m === "string" ? m : m.archivedUrl || m.originalUrl;
                    if (!url) return null;

                    return (
                      <div key={i} className="group relative overflow-hidden rounded-2xl border border-surface-border bg-surface/30">
                        <img
                          src={url}
                          alt={`Preserved Media ${i + 1}`}
                          className="w-full object-contain max-h-[70vh] transition-transform duration-700 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {content && (
              <article className="prose prose-zinc max-w-3xl">
                <p className="font-serif text-2xl leading-relaxed text-foreground/90 whitespace-pre-wrap selection:bg-accent/20">
                  {content}
                </p>
              </article>
            )}

            <div className="border-t border-surface-border pt-12">
               <div className="grid gap-12 md:grid-cols-2">
                  <div className="space-y-6">
                    <p className="archive-label text-foreground">Archival Manifest</p>
                    <div className="space-y-4 rounded-2xl border border-surface-border bg-surface/30 p-8 font-mono text-[11px] leading-relaxed text-muted-foreground">
                       <p><span className="text-accent">"original_filename":</span> "{data.data?.name || 'unknown'}"</p>
                       <p><span className="text-accent">"checksum_sha256":</span> "{checksum}"</p>
                       <p><span className="text-accent">"capture_provenance":</span> "{platform || 'user_upload'}"</p>
                       <p><span className="text-accent">"archived_at":</span> "{new Date(data.createdAt).toISOString()}"</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <p className="archive-label text-foreground">Living Context</p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground font-medium">
                      This digital object was captured on <span className="text-foreground">{timestamp}</span>. 
                      It is part of the <span className="text-foreground">March 2026 Archive Capsule</span>. 
                      The original bitstream is preserved in immutable storage.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {["Preserved", "Verified", "High-Fidelity"].map(tag => (
                            <div key={tag} className="flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                <CheckIcon className="h-3 w-3 text-accent" />
                                {tag}
                            </div>
                        ))}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Metadata Sidebar */}
          <aside className="lg:col-span-4 space-y-12">
            <section className="archive-card p-10 space-y-10">
              <div className="space-y-4">
                <p className="archive-label">Metadata Card</p>
                <div className="space-y-6">
                   <div className="space-y-1.5 border-b border-surface-border/50 pb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Object Title</p>
                      <p className="text-[14px] font-bold text-foreground">{title}</p>
                   </div>
                   <div className="space-y-1.5 border-b border-surface-border/50 pb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Archival Date</p>
                      <p className="text-[14px] font-bold text-foreground">{timestamp}</p>
                   </div>
                   <div className="space-y-1.5 border-b border-surface-border/50 pb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source Provenance</p>
                      <p className="text-[14px] font-bold text-foreground uppercase tracking-widest">{platform}</p>
                   </div>
                   <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Integrity Hash</p>
                      <p className="break-all font-mono text-[10px] text-accent font-bold">{checksum}</p>
                   </div>
                </div>
              </div>

              {data.sourceUrl && (
                <div className="space-y-4">
                  <p className="archive-label">Original URI</p>
                  <a 
                    href={data.sourceUrl} 
                    target="_blank" 
                    className="block break-all rounded-xl bg-surface p-4 text-[10px] font-mono text-muted transition-colors hover:text-foreground border border-surface-border"
                  >
                    {data.sourceUrl}
                  </a>
                </div>
              )}
            </section>

            <div className="rounded-2xl bg-accent/5 p-10 border border-accent/10">
               <p className="archive-label text-accent mb-4">Preservation Note</p>
               <p className="text-[12px] font-medium leading-relaxed text-muted-foreground italic">
                 "Every digital object is a witness to a moment in time. By preserving the original file and its context, we ensure that the story remains accurate for future generations."
               </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

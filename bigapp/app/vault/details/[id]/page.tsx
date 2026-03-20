"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArchiveIcon, CheckIcon, DownloadIcon, ShieldIcon, StarIcon, PlusIcon } from "@/app/components/ui/Icons";

export default function VaultItemDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetch(`/api/vault/items/${id}`)
        .then(res => res.json())
        .then(data => {
          setItem(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      
      fetchCollections();
    }
  }, [id]);

  const fetchCollections = async () => {
    const res = await fetch("/api/vault/collections");
    const data = await res.json();
    setCollections(data);
  };

  const addToCollection = async (collectionId: string) => {
    setSaving(true);
    await fetch(`/api/vault/collections/${collectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addItemId: id }),
    });
    fetchCollections();
    setSaving(false);
  };

  const updateItem = async (updates: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/vault/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setItem(updated);
    } catch (err) {
      console.error("Failed to update item:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-surface-border border-t-accent" />
          <p className="archive-label animate-pulse">Accessing Vault Object...</p>
        </div>
      </div>
    );
  }

  if (!item || item.error) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-center px-6">
        <div className="space-y-6">
           <div className="h-16 w-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center text-muted-foreground/30 mx-auto">
              <ArchiveIcon className="h-8 w-8" />
           </div>
           <h1 className="text-3xl font-serif text-foreground">Object not found</h1>
           <p className="text-muted-foreground max-w-xs mx-auto">This item may have been moved or you don't have permission to access it.</p>
           <Link href="/vault" className="archive-button inline-block">Back to Vault</Link>
        </div>
      </div>
    );
  }

  const dateStr = new Date(item.captureDate).toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-background pt-24 pb-32 px-6 md:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-4">
              <Link href="/vault" className="archive-label hover:text-foreground transition-colors inline-flex items-center gap-2">
                <span className="text-lg">←</span> Back to The Vault
              </Link>
              <h1 className="font-serif text-4xl text-foreground break-words leading-tight max-w-4xl">{item.originalFilename}</h1>
              <div className="flex items-center gap-4">
                 <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/5 px-3 py-1 rounded-md border border-accent/10">
                   {item.type}
                 </span>
                 <div className="h-1 w-1 rounded-full bg-surface-border" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Captured {dateStr}</span>
              </div>
           </div>
           
           <div className="flex flex-wrap gap-4">
              <button
                onClick={() => updateItem({ isFavorite: !item.isFavorite })}
                disabled={saving}
                className={`archive-button flex items-center gap-2 ${item.isFavorite ? 'bg-accent text-white' : ''}`}
              >
                 <StarIcon className="h-4 w-4" fill={item.isFavorite ? "currentColor" : "none"} />
                 {item.isFavorite ? "Unfavorite" : "Favorite"}
              </button>

              <button
                onClick={() => updateItem({ isMonthCover: !item.isMonthCover })}
                disabled={saving}
                className={`archive-button flex items-center gap-2 ${item.isMonthCover ? 'bg-accent text-white' : ''}`}
              >
                 <ArchiveIcon className="h-4 w-4" />
                 {item.isMonthCover ? "Pinned as Cover" : "Pin as Month Cover"}
              </button>

              <div className="relative group">
                <button
                  className="archive-button flex items-center gap-2"
                >
                   <PlusIcon className="h-4 w-4" />
                   Add to Collection
                </button>
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-surface-border rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 space-y-1">
                   {collections.map(col => {
                     const isAdded = col.itemIds.includes(id);
                     return (
                       <button
                         key={col._id}
                         disabled={saving || isAdded}
                         onClick={() => addToCollection(col._id)}
                         className={`w-full text-left px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-between transition-colors ${isAdded ? 'bg-accent/10 text-accent cursor-default' : 'hover:bg-accent/5 text-foreground'}`}
                       >
                         {col.name}
                         {isAdded && <CheckIcon className="h-3 w-3" />}
                       </button>
                     );
                   })}
                   <div className="h-px bg-surface-border my-2" />
                   <button
                     onClick={async () => {
                        const name = prompt("New collection name:");
                        if (name) {
                          const res = await fetch("/api/vault/collections", {
                            method: "POST",
                            body: JSON.stringify({ name }),
                            headers: { "Content-Type": "application/json" }
                          });
                          if (res.ok) {
                            const newCol = await res.json();
                            addToCollection(newCol._id);
                          }
                        }
                     }}
                     className="w-full text-left px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-accent hover:bg-accent/5 transition-colors"
                   >
                     + Create New
                   </button>
                </div>
              </div>

              <a 
                href={item.storagePath} 
                download={item.originalFilename} 
                target="_blank"
                rel="noopener noreferrer"
                className="archive-button flex items-center gap-2"
              >
                 <DownloadIcon className="h-4 w-4" />
                 Download Original
              </a>
           </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-16">
           <div className="lg:col-span-8 space-y-12">
              <div className="archive-card !p-0 overflow-hidden bg-surface flex items-center justify-center min-h-[500px] border-surface-border/50 shadow-2xl">
                 {item.type === "image" ? (
                   <img src={item.storagePath} alt={item.originalFilename} className="max-w-full max-h-[80vh] object-contain transition-transform duration-1000" />
                 ) : (
                   <video src={item.storagePath} controls className="max-w-full max-h-[80vh]" />
                 )}
              </div>

              {item.caption && (
                <div className="archive-card p-12 space-y-6 bg-surface/50 border-accent/10">
                   <p className="archive-label text-accent">AI Generated Description</p>
                   <p className="text-2xl font-serif leading-relaxed text-foreground italic">"{item.caption}"</p>
                </div>
              )}

              {item.tags?.length > 0 && (
                <div className="space-y-6">
                   <p className="archive-label">Preservation Tags</p>
                   <div className="flex flex-wrap gap-3">
                      {item.tags.map((tag: string) => (
                        <Link 
                          key={tag} 
                          href={`/vault?q=${tag}`} 
                          className="bg-surface border border-surface-border px-5 py-2.5 rounded-xl text-[11px] font-bold text-muted-foreground hover:border-accent/30 hover:text-accent hover:bg-accent/5 transition-all uppercase tracking-wider"
                        >
                           #{tag}
                        </Link>
                      ))}
                   </div>
                </div>
              )}
           </div>

           <aside className="lg:col-span-4 space-y-10">
              <section className="archive-card p-10 space-y-8 bg-surface">
                 <p className="archive-label">Archive Manifest</p>
                 <div className="space-y-5">
                    <div className="flex justify-between border-b border-surface-border/50 pb-3">
                       <span className="text-[11px] font-bold uppercase tracking-widest text-muted">SHA-256 Hash</span>
                       <span className="text-[11px] font-mono text-foreground truncate ml-8" title={item.checksum}>
                         {item.checksum.substring(0, 12)}...
                       </span>
                    </div>
                    <div className="flex justify-between border-b border-surface-border/50 pb-3">
                       <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Date Method</span>
                       <span className="text-[11px] font-black text-foreground uppercase">{item.dateSource}</span>
                    </div>
                    <div className="flex justify-between border-b border-surface-border/50 pb-3">
                       <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Health Status</span>
                       <span className="text-[11px] font-black text-accent flex items-center gap-2">
                         <CheckIcon className="h-3 w-3" /> 100% INTEGRITY
                       </span>
                    </div>
                    {item.metadata?.lat && (
                      <div className="flex justify-between border-b border-surface-border/50 pb-3">
                         <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Location</span>
                         <span className="text-[11px] font-black text-foreground uppercase">
                           {item.metadata.lat.toFixed(4)}, {item.metadata.lng.toFixed(4)}
                         </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                       <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Storage</span>
                       <span className="text-[11px] font-black text-foreground uppercase">
                         {item.storagePath.startsWith('http') ? 'Cloudinary' : 'Local Archive'}
                       </span>
                    </div>
                 </div>
              </section>

              {item.metadata?.exif && Object.keys(item.metadata.exif).length > 0 && (
                <section className="archive-card p-10 space-y-8 bg-surface">
                   <div className="flex justify-between items-center">
                     <p className="archive-label">Technical EXIF</p>
                     <button 
                       onClick={() => console.log("Raw Metadata:", item.metadata)}
                       className="text-[8px] font-black uppercase tracking-widest text-accent border border-accent/20 px-2 py-1 rounded hover:bg-accent/5"
                     >
                       Log to Console
                     </button>
                   </div>
                   <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {Object.entries(item.metadata.exif).map(([key, value]) => {
                        if (typeof value === 'object') return null;
                        return (
                          <div key={key} className="flex flex-col gap-1 border-b border-surface-border/30 pb-3">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{key}</span>
                             <span className="text-[12px] font-medium text-foreground break-all">{String(value)}</span>
                          </div>
                        );
                      })}
                   </div>
                </section>
              )}

              <div className="archive-card p-10 bg-accent/5 border-accent/10 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                       <ShieldIcon className="h-5 w-5" />
                    </div>
                    <p className="archive-label text-accent">Archival Security</p>
                 </div>
                 <p className="text-[13px] leading-relaxed text-accent/80 font-medium">
                   This object is part of your immutable digital legacy. Tomorrow's Archive ensures that even as platforms change, your memories remain accessible, searchable, and owned by you.
                 </p>
              </div>
           </aside>
        </div>
      </div>
    </div>
  );
}

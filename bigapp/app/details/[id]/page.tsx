"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function DetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    fetch(`/api/details/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Item not found");
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
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <p className="animate-pulse text-neutral-400">Loading details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-neutral-50 gap-4">
        <p className="text-red-500 font-medium">{error || "Item not found"}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  const { data, type } = item;
  const isArchive = type === "archive";
  
  // Normalize fields for display
  const title = isArchive 
    ? data.title 
    : (data.data.title || data.data.displayName || data.data.name || data.data.username || `Archive from ${data.platform || data.source}`);
  const content = isArchive 
    ? data.textContent 
    : (data.data.text || data.data.bio || "");
  const timestamp = new Date(data.sourceTimestamp || data.createdAt).toLocaleString();
  const media = isArchive ? data.media : data.mediaRefs; 

  const platform = data.platform || data.source;

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-100">
        <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
          <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-blue-600 flex items-center gap-2">
            ← Back
          </Link>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
              {platform}
            </span>
            <span className="px-3 py-1 bg-neutral-100 text-neutral-500 rounded-full text-xs font-medium">
              {type}
              {data.kind && ` / ${data.kind}`}
            </span>
          </div>
        </div>

        <div className="p-12 space-y-12">
          <header className="space-y-4">
            <h1 className="text-4xl font-bold text-neutral-900 leading-tight">
              {title || "Untitled Record"}
            </h1>
            <div className="flex items-center gap-4 text-sm text-neutral-400">
              {data.author && <span>by <span className="text-neutral-900 font-medium">{data.author}</span></span>}
              <span>•</span>
              <time>{timestamp}</time>
            </div>
          </header>

          {content && (
            <div className="prose prose-neutral max-w-none">
              <p className="text-xl text-neutral-800 leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>
          )}

          {media && media.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {media.map((m: any, i: number) => {
                const url = typeof m === "string" ? m : m.archivedUrl || m.originalUrl;
                if (!url) return null;

                return (
                  <div key={i} className="aspect-video bg-neutral-100 rounded-xl overflow-hidden group border border-neutral-100 relative shadow-sm">
                    <img 
                      src={url} 
                      alt={`Media asset ${i + 1}`} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-neutral-400 text-xs">Failed to load media</div>`;
                      }}
                    />
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
                    >
                      View Original
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-8 border-t border-neutral-100">
              {data.tags.map((tag: string) => (
                <span key={tag} className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {data.sourceUrl && (
            <div className="pt-8 border-t border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest mb-4">Original Source</h3>
              <a 
                href={data.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-blue-600 break-all underline decoration-neutral-200 underline-offset-4"
              >
                {data.sourceUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

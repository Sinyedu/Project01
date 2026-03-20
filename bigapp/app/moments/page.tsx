"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArchiveIcon, SearchIcon } from "@/app/components/ui/Icons";

export default function MomentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [moments, setMoments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMoments = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    
    try {
      const res = await fetch(`/api/moments/search?${params.toString()}`);
      const data = await res.json();
      setMoments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoments();
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) params.set("q", query);
    else params.delete("q");
    router.push(`/moments?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 pt-24 pb-32 md:px-12">
      <header className="mb-24 space-y-8 text-center">
        <p className="archive-label">AI Clustering</p>
        <h1 className="font-serif text-5xl tracking-tight text-foreground md:text-7xl">
          Lived Moments
        </h1>
        <p className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground">
          Beautifully clustered groups of your memories, profiles, and media. Grounded in your archives, enriched by AI.
        </p>
      </header>

      <form onSubmit={handleSearch} className="mb-24 mx-auto max-w-xl">
        <div className="relative group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, topic, or person..."
            className="w-full rounded-full border border-surface-border bg-surface/50 py-5 pl-12 pr-32 text-lg text-foreground outline-none ring-accent/20 transition-all focus:bg-surface focus:ring-4"
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted transition-colors group-focus-within:text-accent" />
          <button
            type="submit"
            className="archive-button absolute right-2 top-2 h-[calc(100%-16px)] px-8"
          >
            Search
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-surface-border border-t-accent"></div>
        </div>
      ) : moments.length > 0 ? (
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {moments.map((moment, index) => (
            <div key={index} className="archive-card group">
               {/* Simplified display since MomentCard is gone */}
               <div className="mb-6 aspect-video overflow-hidden rounded-xl bg-surface-border/20">
                  {moment.media?.[0] && (
                    <img src={moment.media[0].url} alt="" className="h-full w-full object-cover grayscale transition-all group-hover:grayscale-0" />
                  )}
               </div>
               <h3 className="font-serif text-2xl text-foreground mb-2">{moment.title || "Untitled Moment"}</h3>
               <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-3 mb-6">
                  {moment.description || moment.summary || "No description available for this cluster."}
               </p>
               <Link href={`/vault/capsule/${moment.id}`} className="archive-label text-accent hover:underline">
                  Explore Cluster →
               </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-surface-border bg-surface/30 p-24 text-center">
          <ArchiveIcon className="mx-auto mb-6 h-16 w-16 text-muted-foreground/40" />
          <h3 className="font-serif text-3xl text-foreground mb-4">No Moments Found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-12">
            Try searching for something else or start a new archive ingest to generate fresh clusters.
          </p>
          <Link href="/dashboard/archive" className="archive-button">
            Preserve New Media
          </Link>
        </div>
      )}
    </div>
  );
}

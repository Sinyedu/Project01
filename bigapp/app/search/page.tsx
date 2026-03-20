"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SearchIcon, ArchiveIcon } from "@/app/components/ui/Icons";

interface SearchResult {
  results: any[];
  total: number;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background pt-24 text-center text-muted">Loading search...</div>}>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeepSearch, setIsDeepSearch] = useState(true);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query) return;
    
    setLoading(true);
    
    // Update URL
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (isDeepSearch) params.set("deep", "true");
    
    router.push(`/search?${params.toString()}`, { scroll: false });

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6">
      <div className="mx-auto max-w-4xl space-y-16">
        <header className="space-y-12">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-black uppercase tracking-[0.3em] text-muted">Archive Search</h1>
            <Link href="/dashboard" className="text-[10px] font-bold uppercase tracking-widest text-muted/40 hover:text-white transition-colors">
              Vault →
            </Link>
          </div>

          <form onSubmit={handleSearch} className="space-y-8">
            <div className="relative group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Recall anything..."
                className="w-full border-b border-border/60 bg-transparent py-4 pl-10 text-3xl font-bold text-white outline-none focus:border-accent/60 transition-all placeholder:text-muted/10"
              />
              <SearchIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 text-muted/20 group-focus-within:text-accent/40 transition-colors" />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-sm font-black uppercase tracking-widest text-accent/60 hover:text-accent disabled:opacity-20 transition-colors"
              >
                {loading ? "..." : "Search"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-3 border-l border-border/10 pl-8">
                <button 
                  type="button"
                  onClick={() => setIsDeepSearch(!isDeepSearch)}
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isDeepSearch ? 'text-emerald-500' : 'text-muted/40'}`}
                >
                  AI Search {isDeepSearch ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </form>
        </header>

        {results && (
          <div className="space-y-12">
            <div className="border-b border-border/10 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted/40">
                {results.total} results found
              </p>
            </div>

            <div className="divide-y divide-border/10">
              {results.results.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-sm text-muted font-medium">No matches in your vault.</p>
                </div>
              ) : (
                results.results.map((record: any) => {
                  const platform = record.platform || record.source;
                  const title = record.data?.title || record.title || record.data?.text?.slice(0, 80);
                  const timestamp = record.sourceTimestamp || record.createdAt;

                  return (
                    <Link 
                      key={record._id} 
                      href={`/details/${record._id}`}
                      className="group block py-8 transition-all hover:px-4 -mx-4 rounded-2xl hover:bg-surface/50"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-6 max-w-2xl">
                          <div 
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface border border-border/40 text-muted"
                          >
                            <ArchiveIcon className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-accent transition-colors leading-tight tracking-tight">
                              {title}
                            </h3>
                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                              <span className="uppercase">{platform}</span>
                              <span>·</span>
                              <span>{new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                        
                        {(record.mediaRefs?.length > 0 || record.media?.length > 0) && (
                           <div className="mt-4 sm:mt-0 flex gap-1">
                              {(record.mediaRefs || record.media).slice(0, 3).map((_: any, idx: number) => (
                                <div key={idx} className="h-1 w-4 rounded-full bg-border/60 group-hover:bg-accent/40 transition-colors" />
                              ))}
                           </div>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

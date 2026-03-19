"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Platform } from "@/core/schema/source";

interface SearchResult {
  results: any[];
  total: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    
    // Update URL
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (platforms.length) params.set("platforms", platforms.join(","));
    router.push(`/search?${params.toString()}`);

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
  }, [initialQuery]);

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold text-neutral-900">Archive Search</h1>
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your memories..."
              className="flex-1 p-4 rounded-lg border border-neutral-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </header>

        {results && (
          <div className="space-y-6">
            <p className="text-neutral-500">Found {results.total} results</p>
            <div className="grid gap-4">
              {results.results.map((record: any) => (
                <div key={record._id} className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium uppercase tracking-wider">
                      {record.platform}
                    </span>
                    <time className="text-sm text-neutral-400">
                      {new Date(record.sourceTimestamp || record.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  
                  <div className="space-y-4">
                    {record.title && (
                      <h3 className="text-lg font-bold text-neutral-900">{record.title}</h3>
                    )}
                    
                    {(record.textContent || record.data?.text) && (
                      <p className="text-lg text-neutral-800 leading-relaxed">
                        {record.textContent || record.data?.text}
                      </p>
                    )}

                    {record.sourceUrl && (
                      <a 
                        href={record.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        View Original Source
                      </a>
                    )}
                    
                    {record.mediaRefs && record.mediaRefs.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {record.mediaRefs.map((url: string, i: number) => (
                          <div key={i} className="aspect-square bg-neutral-100 rounded-lg overflow-hidden">
                            {/* Placeholder for media */}
                            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                              Media {i + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {record.tags && record.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {record.tags.map((tag: string) => (
                          <span key={tag} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

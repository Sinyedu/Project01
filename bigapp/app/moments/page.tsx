"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MomentCard from "@/app/components/ui/MomentCard";

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
    
    const res = await fetch(`/api/moments/search?${params.toString()}`);
    const data = await res.json();
    setMoments(data);
    setLoading(false);
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
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-6 py-24">
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-neutral-900">Your Moments</h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-500">
            Beautifully clustered groups of your memories, profiles, and media. Grounded in your archives, enriched by AI.
          </p>
        </header>

        <form onSubmit={handleSearch} className="mb-16 mx-auto max-w-xl">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, topic, or person..."
              className="w-full rounded-full border border-neutral-200 bg-white px-8 py-5 text-lg shadow-lg focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:ring-opacity-50"
            />
            <button
              type="submit"
              className="absolute right-3 top-3 rounded-full bg-blue-600 px-8 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </form>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : moments.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {moments.map((moment) => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-neutral-200 bg-white p-24 text-center">
            <span className="mb-4 block text-6xl">🎞️</span>
            <h3 className="mb-2 text-2xl font-bold text-neutral-900">No Moments Found</h3>
            <p className="text-neutral-500">
              Try searching for something else or start a new archive ingest to generate fresh Moments.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

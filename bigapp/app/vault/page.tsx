"use client";

import { useState, useEffect, Suspense } from "react";
import { SearchIcon, ArchiveIcon, LockIcon } from "@/app/components/ui/Icons";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function VaultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [items, setItems] = useState<any[]>([]);
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [type, setType] = useState(searchParams.get("type") || "all");
  const [selectedYear, setSelectedYear] = useState(searchParams.get("year") || "all");
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get("month") || "all");

  useEffect(() => {
    fetchCapsules();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
      updateUrl();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, type, selectedYear, selectedMonth]);

  const updateUrl = () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (type !== "all") params.set("type", type);
    if (selectedYear !== "all") params.set("year", selectedYear);
    if (selectedMonth !== "all") params.set("month", selectedMonth);
    
    const queryString = params.toString();
    const newPath = queryString ? `/vault?${queryString}` : "/vault";
    window.history.replaceState(null, "", newPath);
  };

  const fetchCapsules = async () => {
    const res = await fetch("/api/vault/capsules");
    const data = await res.json();
    setCapsules(data);
  };

  const fetchItems = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      q: search,
      type,
      year: selectedYear,
      month: selectedMonth,
    });
    const res = await fetch(`/api/vault?${params}`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  const years = Array.from(new Set(capsules.map(c => c.year))).sort().reverse();
  const months = [
    { label: "January", value: "01" },
    { label: "February", value: "02" },
    { label: "March", value: "03" },
    { label: "April", value: "04" },
    { label: "May", value: "05" },
    { label: "June", value: "06" },
    { label: "July", value: "07" },
    { label: "August", value: "08" },
    { label: "September", value: "09" },
    { label: "October", value: "10" },
    { label: "November", value: "11" },
    { label: "December", value: "12" },
  ];

  const handleCapsuleClick = (year: string, month: string) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-32 px-6 md:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-16 space-y-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-surface-border text-accent">
              <LockIcon className="h-5 w-5" />
            </div>
            <h1 className="font-serif text-4xl tracking-tight text-foreground">The Vault</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by filename, tag, or AI description..."
                className="w-full bg-surface border border-surface-border rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-4 w-full md:w-auto">
               <select 
                className="bg-surface border border-surface-border rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none cursor-pointer"
                value={type}
                onChange={(e) => setType(e.target.value)}
               >
                 <option value="all">All Media</option>
                 <option value="image">Images Only</option>
                 <option value="video">Videos Only</option>
               </select>

               <select 
                className="bg-surface border border-surface-border rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none cursor-pointer"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
               >
                 <option value="all">Any Year</option>
                 {years.map(y => <option key={y as string} value={y as string}>{y as string}</option>)}
               </select>

               <select 
                className="bg-surface border border-surface-border rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none cursor-pointer"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
               >
                 <option value="all">Any Month</option>
                 {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
               </select>

               {(selectedYear !== "all" || selectedMonth !== "all" || type !== "all" || search !== "") && (
                 <button 
                  onClick={() => { setSearch(""); setType("all"); setSelectedYear("all"); setSelectedMonth("all"); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
                 >
                   Reset Filters
                 </button>
               )}
            </div>
          </div>
        </header>

        {/* Monthly Capsules Section */}
        {capsules.length > 0 && !search && selectedYear === "all" && selectedMonth === "all" && (
           <section className="mb-20">
              <h2 className="archive-label mb-8">Monthly Capsules</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {capsules.map(capsule => (
                  <button 
                    key={capsule.monthKey} 
                    onClick={() => handleCapsuleClick(capsule.year, capsule.month)}
                    className="group text-left"
                  >
                    <div className="archive-card p-6 border-accent/10 hover:border-accent/30 transition-all hover:shadow-lg bg-surface">
                       <div className="flex justify-between items-start mb-4">
                          <div className="h-8 w-8 rounded-lg bg-accent/5 flex items-center justify-center text-accent">
                            <ArchiveIcon className="h-4 w-4" />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground">{capsule.itemCount} items</span>
                       </div>
                       <h3 className="font-serif text-lg text-foreground group-hover:text-accent transition-colors">{capsule.title}</h3>
                       <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                          <div className="h-1 w-1 rounded-full bg-accent" />
                          Encrypted Capsule
                       </div>
                    </div>
                  </button>
                ))}
              </div>
           </section>
        )}

        {/* Media Grid */}
        <div className="space-y-8">
           <div className="flex items-center justify-between border-b border-surface-border pb-6">
              <h2 className="archive-label text-foreground">
                {loading ? "Accessing Vault..." : `Vault Results (${items.length})`}
              </h2>
              {items.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Secure Storage
                </span>
              )}
           </div>

           {items.length === 0 && !loading ? (
             <div className="py-32 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-surface border border-surface-border flex items-center justify-center text-muted-foreground/30">
                  <ArchiveIcon className="h-8 w-8" />
                </div>
                <div>
                   <h3 className="text-xl font-serif">No objects found</h3>
                   <p className="text-sm text-muted-foreground">The archive is empty for this criteria.</p>
                </div>
             </div>
           ) : (
             <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {items.map((item) => (
                  <Link key={item._id} href={`/vault/details/${item._id}`} className="group relative aspect-square overflow-hidden rounded-xl bg-surface border border-surface-border transition-all hover:scale-[1.02] hover:shadow-2xl">
                    <img 
                      src={item.storagePath} 
                      alt={item.originalFilename}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                       <p className="text-[10px] text-white/90 truncate font-bold">{item.originalFilename}</p>
                       <p className="text-[8px] text-white/60 font-black uppercase tracking-widest">
                         {new Date(item.captureDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                       </p>
                    </div>
                    {item.type === "video" && (
                       <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
                          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                       </div>
                    )}
                  </Link>
                ))}
             </div>
           )}
        </div>

        {/* Danger Zone */}
        <div className="mt-32 pt-12 border-t border-surface-border/50">
           <div className="archive-card border-red-500/10 bg-red-500/5 p-12 space-y-6">
              <div>
                 <h3 className="text-xl font-serif text-foreground">Danger Zone</h3>
                 <p className="text-sm text-muted-foreground mt-2">
                   Once you delete your vault, there is no going back. All media files in the archive will be permanently wiped from our storage.
                 </p>
              </div>
              <button 
                onClick={async () => {
                  if (confirm("Are you absolutely sure? This will PERMANENTLY delete all your archived media and data. This action cannot be undone.")) {
                    const res = await fetch("/api/vault/delete-all", { method: "POST" });
                    const data = await res.json();
                    if (data.success) {
                      alert(data.message);
                      router.push("/dashboard");
                    } else {
                      alert(data.error || "Failed to delete vault");
                    }
                  }
                }}
                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Permanently Wipe My Vault
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

export default function VaultPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    }>
      <VaultContent />
    </Suspense>
  );
}

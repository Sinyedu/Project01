"use client";

import { useState, useEffect, Suspense } from "react";
import { SearchIcon, ArchiveIcon, LockIcon, StarIcon, MapIcon, ClockIcon, PlusIcon } from "@/app/components/ui/Icons";
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
  const [favoritesOnly, setFavoritesOnly] = useState(searchParams.get("favorites") === "true");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "archive");

  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [mapItems, setMapItems] = useState<any[]>([]);
  const [isRescanning, setIsRescanning] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    // Load Leaflet CSS dynamically
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    
    // Load Leaflet JS
    if (!(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        console.log('Leaflet loaded');
        // Trigger a re-render to initialize map if we are on map tab
        if (activeTab === "map") fetchMapItems();
      };
      document.body.appendChild(script);
    }

    fetchCapsules();
    fetchTimeline();
    fetchCollections();
    fetchMapItems();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
      updateUrl();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, type, selectedYear, selectedMonth, favoritesOnly, activeTab]);

  const updateUrl = () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (type !== "all") params.set("type", type);
    if (selectedYear !== "all") params.set("year", selectedYear);
    if (selectedMonth !== "all") params.set("month", selectedMonth);
    if (favoritesOnly) params.set("favorites", "true");
    if (activeTab !== "archive") params.set("tab", activeTab);
    
    const queryString = params.toString();
    const newPath = queryString ? `/vault?${queryString}` : "/vault";
    window.history.replaceState(null, "", newPath);
  };

  const fetchTimeline = async () => {
    const res = await fetch("/api/vault/timeline");
    if (!res.ok) return;
    const data = await res.json();
    setTimelineData(data);
  };

  const fetchCollections = async () => {
    const res = await fetch("/api/vault/collections");
    if (!res.ok) return;
    const data = await res.json();
    setCollections(data);
  };

  const fetchMapItems = async () => {
    const res = await fetch("/api/vault/map");
    if (!res.ok) return;
    const data = await res.json();
    setMapItems(data);
  };

  const rescanMetadata = async (force: boolean = false, useAI: boolean = false) => {
    setIsRescanning(true);
    try {
      const res = await fetch("/api/vault/maintenance/rescan-metadata", { 
        method: "POST",
        body: JSON.stringify({ force, useAI })
      });
      const data = await res.json();
      alert(`Scanned ${data.scanned} items, updated ${data.updated} with GPS data.`);
      fetchMapItems();
    } catch (err) {
      alert("Rescan failed.");
    } finally {
      setIsRescanning(false);
    }
  };

  const fetchCapsules = async () => {
    const res = await fetch("/api/vault/capsules");
    const data = await res.json();
    setCapsules(data);
  };

  // Map Initialization and Marker Sync
  useEffect(() => {
    let map: any = mapInstance;

    if (activeTab === "map" && (window as any).L && mapItems.length >= 0) {
      const L = (window as any).L;
      
      // Short delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const container = document.getElementById('vault-map');
        if (!container) return;

        // Check if container already has a map (Leaflet attaches a property)
        if ((container as any)._leaflet_id && !map) {
           // If we lost our state but DOM still has map, we might need to clean up
           // but it's safer to just return if we think it's handled.
           return;
        }

        if (!map) {
          map = L.map('vault-map', { zoomControl: false }).setView([20, 0], 2);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);
          L.control.zoom({ position: 'bottomright' }).addTo(map);
          setMapInstance(map);
        }

        // Force Leaflet to recalculate size (fixes black map issue)
        map.invalidateSize();

        // Clear and Sync Markers
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) map.removeLayer(layer);
        });

        const markers: any[] = [];
        mapItems.forEach((item: any) => {
          if (item.metadata?.lat && item.metadata?.lng) {
            const marker = L.marker([item.metadata.lat, item.metadata.lng]).addTo(map);
            marker.bindPopup(`
              <div style="color: black; min-width: 150px;">
                <img src="${item.storagePath}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px;" />
                <p style="font-weight: bold; margin: 8px 0 4px 0; font-size: 10px;">${item.originalFilename}</p>
                <a href="/vault/details/${item._id}" style="display: block; text-align: center; background: black; color: white; padding: 4px; border-radius: 4px; text-decoration: none; font-size: 9px; font-weight: 900;">VIEW RECORD</a>
              </div>
            `);
            markers.push(marker);
          }
        });

        if (markers.length > 0) {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.5));
        }
      }, 200);

      return () => clearTimeout(timer);
    } else if (activeTab !== "map" && map) {
       // Cleanup map when leaving the tab
       map.remove();
       setMapInstance(null);
    }
  }, [activeTab, mapItems, mapInstance]);

  const fetchItems = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      q: search,
      type,
      year: selectedYear,
      month: selectedMonth,
      favorites: favoritesOnly ? "true" : "false",
    });
    const res = await fetch(`/api/vault?${params}`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  const toggleFavorite = async (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newStatus = !item.isFavorite;
    
    // Optimistic update
    setItems(prev => prev.map(i => i._id === item._id ? { ...i, isFavorite: newStatus } : i));
    
    await fetch(`/api/vault/items/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: newStatus }),
    });
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
            <div className="flex items-center gap-1 bg-surface p-1 rounded-2xl border border-surface-border">
               {[
                 { id: "archive", label: "Archive", icon: ArchiveIcon },
                 { id: "timeline", label: "Timeline", icon: ClockIcon },
                 { id: "collections", label: "Collections", icon: StarIcon },
                 { id: "map", label: "Map View", icon: MapIcon }
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground hover:bg-surface-border/50'}`}
                 >
                   <tab.icon className="h-3 w-3" />
                   {tab.label}
                 </button>
               ))}
            </div>

            <div className="flex flex-wrap gap-4 w-full md:w-auto">
               {activeTab === "archive" && (
                 <>
                  <button
                    onClick={() => setFavoritesOnly(!favoritesOnly)}
                    className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${favoritesOnly ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-surface-border'}`}
                  >
                    <StarIcon className="h-3 w-3" fill={favoritesOnly ? "currentColor" : "none"} />
                    Favorites
                  </button>

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

                  {(selectedYear !== "all" || selectedMonth !== "all" || type !== "all" || search !== "" || favoritesOnly) && (
                    <button 
                      onClick={() => { 
                        setSearch(""); 
                        setType("all"); 
                        setSelectedYear("all"); 
                        setSelectedMonth("all"); 
                        setFavoritesOnly(false);
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </>
               )}

               {activeTab === "collections" && (
                 <button 
                   onClick={async () => {
                     const name = prompt("Enter collection name:");
                     if (name) {
                        const res = await fetch("/api/vault/collections", {
                          method: "POST",
                          body: JSON.stringify({ name }),
                          headers: { "Content-Type": "application/json" }
                        });
                        if (res.ok) fetchCollections();
                     }
                   }}
                   className="bg-accent text-white flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                 >
                   <PlusIcon className="h-3 w-3" />
                   Create Collection
                 </button>
               )}
            </div>
          </div>
        </header>

        {/* Main Content Areas */}
        {activeTab === "archive" && (
          <div className="space-y-16">
            {/* Search Bar only for Archive tab */}
            <div className="relative w-full md:max-w-2xl mx-auto">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by filename, tag, or AI description..."
                className="w-full bg-surface border border-surface-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

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
                        <div className="archive-card overflow-hidden border-accent/10 hover:border-accent/30 transition-all hover:shadow-lg bg-surface relative aspect-[4/5]">
                           {capsule.coverImage ? (
                             <img src={capsule.coverImage} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" alt="" />
                           ) : (
                             <div className="absolute inset-0 bg-accent/5" />
                           )}
                           <div className="relative h-full p-6 flex flex-col justify-between z-10">
                              <div className="flex justify-between items-start">
                                 <div className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm border border-surface-border flex items-center justify-center text-accent">
                                   <ArchiveIcon className="h-4 w-4" />
                                 </div>
                                 <span className="text-[10px] font-bold bg-background/80 backdrop-blur-sm border border-surface-border px-2 py-1 rounded-md text-foreground">{capsule.itemCount} items</span>
                              </div>
                              <div>
                                <h3 className="font-serif text-xl text-foreground group-hover:text-accent transition-colors drop-shadow-md">{capsule.title}</h3>
                                <div className="mt-2 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-foreground/60">
                                   <div className="h-1 w-1 rounded-full bg-accent" />
                                   Monthly Archive
                                </div>
                              </div>
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
                      <div key={item._id} className="group relative aspect-square overflow-hidden rounded-xl bg-surface border border-surface-border transition-all hover:scale-[1.02] hover:shadow-2xl">
                        <Link href={`/vault/details/${item._id}`} className="block h-full w-full">
                          <img 
                            src={item.storagePath} 
                            alt={item.originalFilename}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                          />
                        </Link>
                        
                        <button
                          onClick={(e) => toggleFavorite(e, item)}
                          className={`absolute top-3 left-3 h-8 w-8 rounded-full flex items-center justify-center transition-all ${item.isFavorite ? 'bg-accent text-white shadow-lg' : 'bg-black/20 text-white/70 hover:bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100'}`}
                        >
                          <StarIcon className="h-4 w-4" fill={item.isFavorite ? "currentColor" : "none"} />
                        </button>

                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
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
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="space-y-12">
            <h2 className="archive-label">Interactive Timeline</h2>
            <div className="relative pl-8 space-y-12 border-l border-surface-border/50 ml-4">
               {timelineData.map((point) => (
                 <div key={point._id} className="relative group">
                    {/* Timeline Node */}
                    <div className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full bg-accent border-4 border-background group-hover:scale-125 transition-transform" />
                    
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                       <div className="md:w-32 pt-1">
                          <span className="text-2xl font-serif text-foreground">{point.year}</span>
                          <span className="block text-[10px] font-black uppercase tracking-widest text-accent mt-1">
                            {new Date(Number(point.year), Number(point.month) - 1).toLocaleDateString(undefined, { month: 'long' })}
                          </span>
                       </div>
                       
                       <button 
                         onClick={() => {
                           setSelectedYear(point.year);
                           setSelectedMonth(point.month);
                           setActiveTab("archive");
                         }}
                         className="flex-1 archive-card bg-surface hover:border-accent/30 transition-all p-0 overflow-hidden flex"
                       >
                          <img src={point.thumbnail} className="h-32 w-32 object-cover" alt="" />
                          <div className="p-8 flex flex-col justify-center">
                             <p className="text-xl font-serif text-foreground">{point.count} Memories Archived</p>
                             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 flex items-center gap-2">
                               View Monthly Capsule 
                               <span className="text-accent">→</span>
                             </p>
                          </div>
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === "collections" && (
          <div className="space-y-12">
            <h2 className="archive-label">Custom Collections</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
               {collections.length === 0 ? (
                 <div className="col-span-full py-24 text-center space-y-6">
                    <p className="text-muted-foreground">No collections created yet.</p>
                    <button 
                      onClick={() => alert("Click Create Collection above to start.")}
                      className="text-accent font-bold text-xs uppercase tracking-widest"
                    >
                      How do I build one?
                    </button>
                 </div>
               ) : (
                 collections.map(col => (
                   <div key={col._id} className="group cursor-pointer">
                      <div className="archive-card p-0 overflow-hidden bg-surface relative aspect-video border-surface-border/50 group-hover:border-accent/30 transition-all">
                         <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 opacity-40 group-hover:opacity-60 transition-opacity">
                            {[0,1,2,3].map(i => (
                              <div key={i} className="bg-accent/5 overflow-hidden">
                                {col.coverItemIds?.[i] && <img src={col.coverItemIds[i]} className="w-full h-full object-cover" />}
                              </div>
                            ))}
                         </div>
                         <div className="relative h-full p-8 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
                            <h3 className="text-2xl font-serif text-white">{col.name}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-2">{col.itemIds?.length || 0} Objects</p>
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="space-y-12">
            <div className="flex justify-between items-end">
               <div className="space-y-4">
                 <h2 className="archive-label">World Archive Map</h2>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => rescanMetadata(false)}
                      disabled={isRescanning}
                      className="text-[10px] font-black uppercase tracking-widest bg-accent/10 border border-accent/20 text-accent px-4 py-2 rounded-xl hover:bg-accent/20 transition-all disabled:opacity-50"
                    >
                      {isRescanning ? "Refreshing..." : "Refresh GPS"}
                    </button>
                    <button 
                      onClick={() => rescanMetadata(false, true)}
                      disabled={isRescanning}
                      className="text-[10px] font-black uppercase tracking-widest bg-accent text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      AI Geotag
                    </button>
                 </div>
               </div>
               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                 {mapItems.length} Geotagged Objects
               </p>
            </div>
            
            <div className="archive-card bg-surface p-0 min-h-[600px] border-surface-border/50 relative overflow-hidden flex flex-col">
               {/* Map Container */}
               <div id="vault-map" className="flex-1 bg-[#0a0a0a] relative z-10" />
               
               {mapItems.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-center p-12 z-20 pointer-events-none">
                     <div className="space-y-4 max-w-sm bg-background/80 backdrop-blur-md p-8 rounded-2xl border border-surface-border shadow-2xl">
                        <MapIcon className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                        <h3 className="text-lg font-serif">No locations found</h3>
                        <p className="text-xs text-muted-foreground">Try uploading the test-gps.jpg sample or use AI Geotag to estimate locations.</p>
                     </div>
                  </div>
               )}

               <div className="p-4 bg-background border-t border-surface-border flex justify-between items-center relative z-20">
                  <p className="text-[10px] text-muted-foreground font-medium">Visualization: OpenStreetMap Pinpointing</p>
                  <div className="flex items-center gap-4">
                     <span className="flex items-center gap-1 text-[9px] font-black uppercase text-accent">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent" /> EXIF Native
                     </span>
                     <span className="flex items-center gap-1 text-[9px] font-black uppercase text-orange-500">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500" /> AI Estimated
                     </span>
                  </div>
               </div>
            </div>
          </div>
        )}

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

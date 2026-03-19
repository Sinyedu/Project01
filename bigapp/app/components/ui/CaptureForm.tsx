"use client";

import { useState, type FormEvent } from "react";
import { PLATFORMS } from "@/core/types/platforms";
import { platformConfigs } from "@/core/config/platforms";

export function CaptureForm() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>(PLATFORMS[0]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, source: platform }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }

      setStatus("success");
      setMessage("Imported! Public content has been added to your archive.");
      setUrl("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="relative group">
        <input
          type="url"
          required
          placeholder="Paste a public profile or page URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border-b border-border/40 bg-transparent py-3 text-lg text-white outline-none focus:border-accent/40 transition-all placeholder:text-muted/20"
        />
      </div>

      <div className="flex items-center justify-between gap-6">
        <div className="flex gap-4">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                platform === p ? "text-accent" : "text-muted/40 hover:text-white"
              }`}
            >
              {platformConfigs[p].name}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-accent disabled:opacity-20 transition-colors"
        >
          {status === "loading" ? "Importing..." : "Import →"}
        </button>
      </div>

      {message && (
        <p className={`text-[10px] font-bold uppercase tracking-widest ${status === "success" ? "text-emerald-500" : "text-red-500"}`}>
          {message}
        </p>
      )}
    </form>
  );
}

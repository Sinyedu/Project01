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
      const res = await fetch("/api/archives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, platform }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Capture failed");
      }

      setStatus("success");
      setMessage("Archived! Content has been captured and preserved.");
      setUrl("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4">
      <div>
        <input
          type="url"
          required
          placeholder="Paste a URL to archive..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder-muted outline-none transition-colors focus:border-accent"
        />
      </div>

      <div className="flex gap-3">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as typeof platform)}
          className="flex-1 appearance-none rounded-lg border border-border bg-surface px-4 py-3 text-foreground outline-none transition-colors focus:border-accent"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {platformConfigs[p].name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-accent px-6 py-3 font-semibold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Archiving..." : "Capture"}
        </button>
      </div>

      {message && (
        <p className={status === "success" ? "text-emerald-400" : "text-red-400"}>
          {message}
        </p>
      )}
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";

export function CapsuleForm() {
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [lockedUntil, setLockedUntil] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/time-capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, textContent, lockedUntil }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create capsule");
      }

      setStatus("success");
      setMessage(`Locked until ${new Date(lockedUntil).toLocaleDateString()}. See you then.`);
      setTitle("");
      setTextContent("");
      setLockedUntil("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const minDate = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4">
      <input
        type="text"
        required
        placeholder="Give your capsule a name..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder-muted outline-none transition-colors focus:border-accent"
      />

      <textarea
        placeholder="What do you want to preserve?"
        rows={4}
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
        className="w-full resize-none rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder-muted outline-none transition-colors focus:border-accent"
      />

      <div className="flex gap-3">
        <input
          type="date"
          required
          min={minDate}
          value={lockedUntil}
          onChange={(e) => setLockedUntil(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-foreground outline-none transition-colors focus:border-accent"
        />

        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-accent px-6 py-3 font-semibold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Sealing..." : "Lock it"}
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

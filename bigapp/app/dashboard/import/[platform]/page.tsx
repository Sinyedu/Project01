"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { platformConfigs } from "@/core/config/platforms";
import { PlatformIcon } from "@/app/components/ui/Icons";
import Link from "next/link";

export default function ImportPage() {
  const { platform } = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);

  const config = platformConfigs[platform as keyof typeof platformConfigs];

  if (!config) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <p className="text-white">Platform not found</p>
        <Link href="/dashboard" className="text-accent underline">Back to Vault</Link>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", platform as string);

    try {
      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setProgress(data);
      setStatus("success");
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 pt-32 pb-20">
      <Link 
        href="/dashboard" 
        className="mb-8 inline-block text-[10px] font-black uppercase tracking-widest text-muted hover:text-white transition-colors"
      >
        ← Back to Vault
      </Link>

      <div className="rounded-3xl border border-border/40 bg-surface/30 p-12 text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface border border-border/40" style={{ color: config.color }}>
          <PlatformIcon platform={platform as string} className="h-10 w-10" />
        </div>

        <h1 className="mb-2 text-3xl font-black text-white tracking-tighter uppercase">
          Import {config.name}
        </h1>
        <p className="mb-12 text-sm text-muted font-medium">
          Upload your official {config.name} export (ZIP, JSON, or HTML).
        </p>

        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-all ${
              file ? "border-accent/40 bg-accent/5" : "border-border/40 hover:border-accent/20 hover:bg-surface/50"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".zip,.json,.html,.txt"
            />
            {file ? (
              <div className="space-y-2">
                <p className="text-sm font-bold text-white uppercase tracking-tight">{file.name}</p>
                <p className="text-[10px] text-muted uppercase font-black">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-border/20">
                  <span className="text-xl">📁</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted">Click or drag to select archive</p>
              </div>
            )}
          </div>

          {status === "idle" && file && (
            <button
              onClick={handleUpload}
              className="w-full rounded-full bg-accent py-4 text-[10px] font-black uppercase tracking-widest text-black transition-transform hover:scale-[1.02] active:scale-95"
            >
              Start Import →
            </button>
          )}

          {status === "uploading" && (
            <div className="space-y-4 py-4">
              <div className="h-1 w-full overflow-hidden rounded-full bg-border/20">
                <div className="h-full w-1/2 animate-[progress_2s_ease-in-out_infinite] rounded-full bg-accent" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-accent animate-pulse">Processing Export...</p>
            </div>
          )}

          {status === "success" && (
            <div className="rounded-2xl bg-emerald-500/10 p-6 border border-emerald-500/20">
              <p className="text-sm font-bold text-emerald-500 uppercase tracking-tight mb-1 text-center">Import Successful!</p>
              <p className="text-[10px] text-emerald-500/60 uppercase font-black text-center">
                {progress?.progress?.processedItems || 0} items processed. Redirecting to vault...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl bg-red-500/10 p-6 border border-red-500/20">
              <p className="text-sm font-bold text-red-500 uppercase tracking-tight mb-1 text-center">Upload Failed</p>
              <p className="text-[10px] text-red-500/60 uppercase font-black text-center">{error}</p>
              <button 
                onClick={() => setStatus("idle")}
                className="mt-4 text-[9px] font-black uppercase tracking-widest text-white underline"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="mt-12 space-y-4 text-left">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white">How to get your export?</h3>
          <p className="text-[11px] leading-relaxed text-muted font-medium">
            Go to your {config.name} settings → Your Information → Download Your Information. 
            Request a copy in <span className="text-white">JSON format</span> for best results. 
            Once the file is ready, download it and upload it here.
          </p>
        </div>
      </div>
    </div>
  );
}

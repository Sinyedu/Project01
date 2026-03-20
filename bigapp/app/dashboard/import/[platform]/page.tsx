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
        <p className="font-serif text-2xl text-foreground">Source Not Identified</p>
        <Link href="/dashboard" className="archive-label text-accent hover:underline">Back to Vault</Link>
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
        throw new Error(data.error || "Transfer failed");
      }

      const data = await res.json();
      setProgress(data);
      setStatus("success");
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 pt-32 pb-32">
      <Link 
        href="/dashboard" 
        className="archive-label mb-12 inline-block transition-colors hover:text-foreground"
      >
        ← Back to Vault
      </Link>

      <div className="rounded-3xl border border-surface-border bg-surface/30 p-12 text-center md:p-20">
        <div className="mx-auto mb-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface border border-surface-border" style={{ color: config.color }}>
          <PlatformIcon platform={platform as string} className="h-10 w-10 opacity-60" />
        </div>

        <h1 className="mb-4 font-serif text-4xl tracking-tight text-foreground">
          Import {config.name} Record
        </h1>
        <p className="mb-12 text-[15px] font-medium leading-relaxed text-muted-foreground">
          Upload your official {config.name} archive. We will extract, verify, and preserve the contents within your vault.
        </p>

        <div className="space-y-8">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-all md:p-16 ${
              file ? "border-accent/40 bg-accent/5" : "border-surface-border hover:border-accent/20 hover:bg-surface/50"
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
                <p className="archive-label text-accent">Archive Selected</p>
                <p className="font-serif text-2xl text-foreground truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="space-y-4 text-muted">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                  <span className="text-xl opacity-60">📁</span>
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest">Select Archive for Ingest</p>
              </div>
            )}
          </div>

          {status === "idle" && file && (
            <button
              onClick={handleUpload}
              className="archive-button w-full py-5 text-xs"
            >
              Begin Archival Process →
            </button>
          )}

          {status === "uploading" && (
            <div className="space-y-6 py-6">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border/30">
                <div className="h-full w-1/2 animate-[progress_2s_ease-in-out_infinite] rounded-full bg-accent" />
              </div>
              <p className="archive-label text-accent animate-pulse">Establishing Secure Stream...</p>
            </div>
          )}

          {status === "success" && (
            <div className="rounded-2xl bg-accent/5 p-8 border border-accent/10">
              <p className="font-serif text-2xl text-accent mb-2">Ingest Complete</p>
              <p className="text-[11px] font-bold text-accent/60 uppercase tracking-widest">
                Record has been successfully integrated into your vault.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl bg-destructive/5 p-8 border border-destructive/10">
              <p className="font-serif text-2xl text-destructive mb-2">Archival Failure</p>
              <p className="text-[11px] font-bold text-destructive/60 uppercase tracking-widest">{error}</p>
              <button 
                onClick={() => setStatus("idle")}
                className="mt-6 text-[10px] font-black uppercase tracking-widest text-foreground underline"
              >
                Attempt Re-Ingest
              </button>
            </div>
          )}
        </div>

        <div className="mt-20 space-y-4 text-left border-t border-surface-border/50 pt-10">
          <h3 className="archive-label text-foreground">Archive Source Instructions</h3>
          <p className="text-[12px] leading-relaxed text-muted-foreground font-medium">
            To acquire your official data, navigate to {config.name} settings → Security/Privacy → Request Data Export. 
            For the highest fidelity preservation, select <span className="text-foreground font-bold">JSON format</span> and <span className="text-foreground font-bold">High Quality</span> media.
          </p>
        </div>
      </div>
    </div>
  );
}

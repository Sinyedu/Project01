"use client";

import { useState, useRef, useEffect } from "react";
import { ArchiveIcon, ShieldIcon, CheckIcon, DownloadIcon } from "@/app/components/ui/Icons";
import Link from "next/link";

interface JobResult {
  totalFiles: number;
  mediaFilesFound: number;
  skippedFiles: number;
  organizedBy: string;
  folders: { path: string; count: number }[];
  downloadUrl?: string;
  archiveManifests: string[];
  stagingPath?: string;
}

export default function PersonalArchivePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File; path: string }[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [finalizing, setFinalizing] = useState<"idle" | "processing" | "success" | "error">("idle");

  // Poll for job status
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === "processing" && jobId) {
      console.log(`[Dashboard] Starting poll for job: ${jobId}`);
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/import/status/${jobId}`);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error(`[Dashboard] Status check failed (${res.status}):`, errorData);
            throw new Error(errorData.error || `Failed to check status (${res.status})`);
          }

          const data = await res.json();
          if (data.status === "completed") {
            console.log(`[Dashboard] Job completed! Result:`, data.result);
            setJobResult(data.result);
            setStatus("success");
            clearInterval(interval);
          } else if (data.status === "failed") {
            console.error(`[Dashboard] Job failed:`, data.error);
            setError(data.error || "Processing failed");
            setStatus("error");
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Status check error:", err);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files).map(f => ({
        file: f,
        path: f.webkitRelativePath || f.name
      })));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items = e.dataTransfer.items;
    if (!items) return;

    const droppedEntries: { file: File; path: string }[] = [];

    const traverseEntry = async (entry: FileSystemEntry, currentPath = "") => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => (entry as FileSystemFileEntry).file(resolve));
        droppedEntries.push({ file, path: currentPath + entry.name });
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve) => {
          dirReader.readEntries(resolve);
        });
        for (const childEntry of entries) {
          await traverseEntry(childEntry, currentPath + entry.name + "/");
        }
      }
    };

    const promises = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        promises.push(traverseEntry(entry));
      }
    }

    await Promise.all(promises);
    setFiles(droppedEntries);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    files.forEach(({ file, path }) => {
      formData.append("file", file, path);
    });
    formData.append("mode", "organize");
    formData.append("outputMode", "staging");

    try {
      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json() as { jobId: string };
      setJobId(data.jobId);
      setStatus("processing");
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleFinalize = async (targetMode: "local" | "cloudinary") => {
    console.log(`[Dashboard] handleFinalize called with mode: ${targetMode}. jobId: ${jobId}, stagingPath: ${jobResult?.stagingPath}`);
    if (!jobId || !jobResult?.stagingPath) {
      console.error("[Dashboard] Missing jobId or stagingPath in jobResult!");
      return;
    }

    setFinalizing("processing");
    try {
      console.log(`[Dashboard] Fetching /api/vault/finalize...`);
      const res = await fetch("/api/vault/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          targetMode,
          stagingPath: jobResult.stagingPath,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Finalization failed");
      }

      setFinalizing("success");
    } catch (err: any) {
      setFinalizing("error");
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 pt-24 pb-32">
      <Link
        href="/vault"
        className="archive-label mb-12 inline-block transition-colors hover:text-foreground"
      >
        ← Back to The Vault
      </Link>

      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="rounded-3xl border border-surface-border bg-surface/30 p-8 md:p-16">
            <header className="mb-12">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-surface-border text-accent">
                <ArchiveIcon className="h-7 w-7" />
              </div>
              <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">
                Preserve New Media
              </h1>
              <p className="mt-4 text-[15px] font-medium leading-relaxed text-muted-foreground max-w-xl">
                The beginning of your history. Upload a collection of photos and videos to create a structured, integrity-verified archival package.
              </p>
            </header>

            {status === "idle" && (
              <div className="space-y-12">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`group cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-all text-center md:p-20 ${files.length > 0 ? "border-accent/40 bg-accent/5" : "border-surface-border hover:border-accent/20 hover:bg-surface/50"
                    }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".zip,image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime"
                    multiple
                  />
                  {files.length > 0 ? (
                    <div className="space-y-4">
                      <p className="archive-label text-accent">Selected for Preservation</p>
                      <p className="font-serif text-3xl text-foreground">
                        {files.length === 1 ? files[0].file.name : `${files.length} items selected`}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {(files.reduce((acc, f) => acc + f.file.size, 0) / (1024 * 1024)).toFixed(2)} MB Collection
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                        <ArchiveIcon className="h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-serif text-2xl text-foreground">Click or drag your media folder or ZIP here</p>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Supported: JPG, PNG, WEBP, HEIC, MP4, MOV</p>
                      </div>
                    </div>
                  )}
                </div>

                {files.length > 0 && (
                  <button
                    onClick={handleUpload}
                    className="archive-button w-full py-6 text-xs"
                  >
                    Build Personal Archive Capsule →
                  </button>
                )}
              </div>
            )}

            {(status === "uploading" || status === "processing") && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-10 relative">
                  <div className="h-24 w-24 animate-spin rounded-full border-[3px] border-surface-border border-t-accent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldIcon className="h-8 w-8 text-accent/40 animate-pulse" />
                  </div>
                </div>
                <h2 className="font-serif text-3xl text-foreground mb-4">
                  {status === "uploading" ? "Transferring Archive..." : "Establishing Integrity..."}
                </h2>
                <p className="max-w-md text-[13px] font-medium leading-relaxed text-muted-foreground">
                  Extracting high-fidelity metadata, calculating SHA-256 checksums, and generating your manifest. Large archives run in background jobs.
                </p>

                <div className="mt-16 w-full max-w-sm space-y-6 text-left border-t border-surface-border/50 pt-8">
                  <div className="flex items-center justify-between">
                    <span className="archive-label">Secure Transfer</span>
                    <div className={`h-1.5 w-1.5 rounded-full ${status === "uploading" ? "bg-accent animate-pulse" : "bg-accent"}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="archive-label">EXIF Extraction</span>
                    <div className={`h-1.5 w-1.5 rounded-full ${status === "processing" ? "bg-accent animate-pulse" : status === "uploading" ? "bg-surface-border" : "bg-accent"}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="archive-label">Integrity Hashing</span>
                    <div className={`h-1.5 w-1.5 rounded-full ${status === "processing" ? "bg-accent animate-pulse" : "bg-surface-border"}`} />
                  </div>
                </div>
              </div>
            )}

            {status === "success" && jobResult && (
              <div className="animate-fade-in space-y-12">
                <div className="rounded-2xl bg-accent/5 p-10 border border-accent/10 text-center md:p-16">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-background">
                    <CheckIcon className="h-7 w-7" />
                  </div>
                  <h2 className="font-serif text-3xl text-foreground mb-2">Analysis Complete</h2>
                  <p className="text-[13px] font-medium text-muted-foreground">
                    {jobResult.mediaFilesFound} media files have been verified and organized. Choose where to permanently store your capsule.
                  </p>
                </div>

                {finalizing === "idle" ? (
                  <div className="space-y-12">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <button
                        onClick={() => handleFinalize("local")}
                        className="group flex flex-col items-center justify-center gap-4 rounded-3xl border border-surface-border bg-surface/20 p-12 transition-all hover:bg-surface/50 hover:border-accent/40"
                      >
                        <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-background transition-colors">
                          <ArchiveIcon className="h-6 w-6" />
                        </div>
                        <div className="text-center">
                          <p className="font-serif text-xl text-foreground">Local Vault</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">Store on this device</p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleFinalize("cloudinary")}
                        className="group flex flex-col items-center justify-center gap-4 rounded-3xl border border-surface-border bg-surface/20 p-12 transition-all hover:bg-surface/50 hover:border-accent/40"
                      >
                        <div className="h-12 w-12 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                          <ShieldIcon className="h-6 w-6" />
                        </div>
                        <div className="text-center">
                          <p className="font-serif text-xl text-foreground">Cloud Vault</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">Sync to Cloudinary</p>
                        </div>
                      </button>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="archive-card hover:bg-surface/50">
                        <p className="archive-label mb-6">Archive Details</p>
                        <div className="space-y-4">
                          <div className="flex justify-between border-b border-surface-border pb-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Media Count</span>
                            <span className="text-[11px] font-black text-foreground">{jobResult.mediaFilesFound}</span>
                          </div>
                          <div className="flex justify-between border-b border-surface-border pb-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Integrity Mode</span>
                            <span className="text-[11px] font-black text-accent uppercase">SHA-256</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Format</span>
                            <span className="text-[11px] font-black text-foreground uppercase">JSON Manifest</span>
                          </div>
                        </div>
                      </div>
                      <div className="archive-card hover:bg-surface/50">
                        <p className="archive-label mb-6">Established Capsules</p>
                        <div className="max-h-32 overflow-y-auto space-y-3 pr-2">
                          {jobResult.folders.map(f => (
                            <div key={f.path} className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
                              <span className="text-muted truncate mr-4">{f.path}</span>
                              <span className="text-accent">{f.count} items</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {jobResult.downloadUrl && (
                        <a
                          href={jobResult.downloadUrl}
                          download
                          className="archive-button-outline w-full py-6 text-xs flex items-center justify-center gap-3"
                        >
                          <DownloadIcon className="h-4 w-4" />
                          Download Organized Archive (.ZIP)
                        </a>
                      )}

                      <button
                        onClick={() => setStatus("idle")}
                        className="archive-label text-center py-4 transition-colors hover:text-foreground"
                      >
                        Discard and Start Over
                      </button>
                    </div>
                  </div>
                ) : finalizing === "processing" ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-surface/20 rounded-3xl border border-surface-border animate-pulse">
                    <div className="h-16 w-16 animate-spin rounded-full border-2 border-accent border-t-transparent mb-8" />
                    <h3 className="font-serif text-3xl text-foreground">Finalizing Vault...</h3>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted mt-4">Establishing permanent record and verifying bitstreams</p>
                  </div>
                ) : finalizing === "success" ? (
                  <div className="rounded-3xl border border-accent/20 bg-accent/5 p-20 text-center animate-fade-in">
                    <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-background">
                      <CheckIcon className="h-10 w-10" />
                    </div>
                    <h3 className="font-serif text-4xl text-foreground mb-4">Vault Integration Complete</h3>
                    <p className="text-[15px] font-medium text-muted-foreground mb-12">Your capsule is now fully integrated and verified.</p>
                    <div className="flex flex-col gap-4">
                      <Link href="/vault" className="archive-button w-full py-6 text-xs inline-block text-center">
                        View in The Vault →
                      </Link>
                      <button
                        onClick={() => {
                          setStatus("idle");
                          setFinalizing("idle");
                          setJobId(null);
                          setJobResult(null);
                        }}
                        className="archive-label text-center py-4 transition-colors hover:text-foreground"
                      >
                        Process Another Archive
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-20 text-center">
                    <p className="font-serif text-3xl text-destructive mb-4">Finalization Failed</p>
                    <p className="text-[15px] font-medium text-muted-foreground mb-12">{error}</p>
                    <button onClick={() => setFinalizing("idle")} className="archive-button bg-destructive text-white border-none py-5 px-12 text-xs">Try Again</button>
                  </div>
                )}
              </div>
            )}

            {status === "error" && (
              <div className="rounded-2xl bg-destructive/5 p-12 border border-destructive/10 text-center">
                <p className="font-serif text-2xl text-destructive mb-2">Archiving Failed</p>
                <p className="text-[13px] font-medium text-muted-foreground mb-8">{error}</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="archive-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-12">
          <section className="archive-card space-y-8 p-10">
            <h3 className="flex items-center gap-3 archive-label text-foreground">
              <ShieldIcon className="h-4 w-4 text-accent" />
              Archival Standards
            </h3>
            <div className="space-y-10">
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-foreground">Bit-Level Preservation</p>
                <p className="text-[12px] leading-relaxed text-muted-foreground font-medium">
                  We maintain bit-for-bit copies of your original files. No compression, no lossy transcoding.
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-foreground">Provenance Tracking</p>
                <p className="text-[12px] leading-relaxed text-muted-foreground font-medium">
                  Every item records its metadata source—EXIF, filename, or filesystem—to ensure historical accuracy.
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-foreground">Open-Portability</p>
                <p className="text-[12px] leading-relaxed text-muted-foreground font-medium">
                  Manifests are stored in open JSON format, ensuring your archive is readable long after this platform ceases to exist.
                </p>
              </div>
            </div>
          </section>

          <div className="rounded-2xl border border-accent/10 bg-accent/5 p-8">
            <p className="archive-label text-accent mb-3">Professional Tip</p>
            <p className="text-[12px] font-medium leading-relaxed text-accent/80">
              For archives exceeding 2GB, we recommend processing them as smaller monthly batches for optimal integrity verification.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

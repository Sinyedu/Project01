"use client";

import { useUser, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { ArchiveIcon, ShieldIcon, CheckIcon, DownloadIcon } from "@/app/components/ui/Icons";

const PRINCIPLES = [
  {
    icon: <ArchiveIcon className="h-6 w-6" />,
    title: "Monthly Capsules",
    description: "Your media is organized into durable chronological units, preserving the context of lived experience.",
  },
  {
    icon: <ShieldIcon className="h-6 w-6" />,
    title: "Bit-Level Integrity",
    description: "Every file is hashed with SHA-256 upon entry. We monitor bit-rot so your memories remain perfect.",
  },
  {
    icon: <DownloadIcon className="h-6 w-6" />,
    title: "Future Portability",
    description: "Archives include human-readable manifests and metadata sidecars, ensuring they remain readable in 2075.",
  },
];

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="space-y-32 pb-32">
      {/* ── Hero ── */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(74,93,78,0.05),transparent_70%)]" />

        <p className="archive-label mb-8 animate-fade-in">Preservation for the next century</p>

        <h1 className="mb-8 font-serif text-6xl leading-[1.1] tracking-tight text-foreground sm:text-8xl md:max-w-4xl">
          Preserve today for the world of 2075.
        </h1>

        <p className="mb-12 max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
          Google Photos organizes. Tomorrow’s Archive preserves. A professional-grade archival system for your personal digital history.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row min-h-[60px] items-center">
          {!isLoaded ? (
            <div className="h-12 w-48 animate-pulse rounded-full bg-surface-border" />
          ) : isSignedIn ? (
            <Link href="/dashboard" className="archive-button">
              Enter Your Vault
            </Link>
          ) : (
            <SignUpButton mode="modal">
              <button className="archive-button">
                Begin Your Archive
              </button>
            </SignUpButton>
          )}
          <Link href="/principles" className="archive-button-outline">
            Our Principles
          </Link>
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="grid gap-16 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="space-y-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-accent">
                {p.icon}
              </div>
              <h3 className="font-serif text-2xl tracking-tight text-foreground">{p.title}</h3>
              <p className="text-[13px] font-medium leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The Capsule Concept ── */}
      <section className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="rounded-3xl border border-surface-border bg-surface/30 p-8 md:p-20">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div className="space-y-8">
              <p className="archive-label">The Monthly Capsule</p>
              <h2 className="font-serif text-4xl leading-tight tracking-tight text-foreground md:text-5xl">
                Messy digital life, turned into durable history.
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                We don&apos;t just store files. We create structured archival packages. Every photo and video is paired with a metadata sidecar, a provenance record, and an integrity checksum.
              </p>
              <ul className="space-y-4">
                {["Original media preserved intact", "Verified capture provenance", "Open-standard manifest files", "Self-contained export packages"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-foreground">
                    <CheckIcon className="h-5 w-5 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual Mockup Placeholder */}
            <div className="relative aspect-square rounded-2xl border border-surface-border bg-background p-8 shadow-inner md:p-12">
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-surface-border pb-4">
                  <span className="archive-label text-accent">Archive Status: Healthy</span>
                  <span className="archive-label">SHA-256 Verified</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Chart 1 */}
                  <div className="group aspect-[3/4] rounded-lg bg-surface relative overflow-hidden">
                    {/* soft gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />

                    {/* label */}
                    <span className="absolute top-3 left-3 text-xs text-muted-foreground">
                      Archive Growth
                    </span>

                    <svg className="absolute inset-0 w-full h-full [shape-rendering:geometricPrecision]">
                      {/* subtle grid */}
                      {[...Array(5)].map((_, i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={i * 40 + 20}
                          x2="100%"
                          y2={i * 40 + 20}
                          className="stroke-muted-foreground/10"
                          strokeWidth="0.5"
                        />
                      ))}

                      {/* area fill */}
                      <defs>
                        <linearGradient id="fade1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(156 163 175)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="rgb(156 163 175)" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      <path
                        d="M0 150 
           C 40 130, 80 95, 120 110 
           S 200 60, 240 75 
           S 320 50, 400 65 
           L400 200 L0 200 Z"
                        fill="url(#fade1)"
                      />

                      {/* main line */}
                      <path
                        d="M0 150 
           C 40 130, 80 95, 120 110 
           S 200 60, 240 75 
           S 320 50, 400 65"
                        className="
          stroke-muted-foreground/70
          stroke-[1.5]
          fill-none
          transition-all
          duration-500
          group-hover:stroke-muted-foreground
        "
                      />

                      {/* endpoint */}
                      <circle cx="400" cy="65" r="2" className="fill-muted-foreground/80" />
                    </svg>
                  </div>

                  {/* Chart 2 */}
                  <div className="group aspect-[3/4] rounded-lg bg-surface relative overflow-hidden">
                    {/* soft gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />

                    {/* label */}
                    <span className="absolute top-3 left-3 text-xs text-muted-foreground">
                      Integrity Trend
                    </span>

                    <svg className="absolute inset-0 w-full h-full [shape-rendering:geometricPrecision]">
                      {/* subtle grid */}
                      {[...Array(5)].map((_, i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={i * 40 + 20}
                          x2="100%"
                          y2={i * 40 + 20}
                          className="stroke-muted-foreground/10"
                          strokeWidth="0.5"
                        />
                      ))}

                      {/* dashed line for variation */}
                      <path
                        d="M0 160 
           C 60 140, 120 100, 180 110 
           S 260 80, 320 90 
           S 360 70, 400 80"
                        className="
          stroke-muted-foreground/60
          stroke-[1.5]
          fill-none
          [stroke-dasharray:4_4]
          transition-all
          duration-500
          group-hover:stroke-muted-foreground
        "
                      />

                      {/* endpoint */}
                      <circle cx="400" cy="80" r="2" className="fill-muted-foreground/70" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full rounded bg-surface" />
                  <div className="h-2 w-2/3 rounded bg-surface" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex h-1/2 items-center justify-center bg-gradient-to-t from-background to-transparent px-8 text-center">
                <p className="font-serif text-lg text-muted-foreground">
                  A calm interface for serious preservation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-8 font-serif text-4xl leading-tight tracking-tight text-foreground md:text-5xl">
          Start your digital legacy today.
        </h2>
        <p className="mb-12 text-lg text-muted-foreground">
          Join a community of individuals dedicated to preserving the texture of everyday life for those who come after us.
        </p>
        <div className="flex flex-col items-center justify-center gap-8 py-12">
          {isLoaded && isSignedIn ? (
            <Link href="/dashboard/archive" className="archive-button">
              Preserve New Media
            </Link>
          ) : isLoaded ? (
            <SignUpButton mode="modal">
              <button className="archive-button">
                Create Your Archive
              </button>
            </SignUpButton>
          ) : (
            <div className="h-12 w-48 animate-pulse rounded-full bg-surface-border" />
          )}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { ShieldIcon, ArchiveIcon, CheckIcon, DownloadIcon } from "@/app/components/ui/Icons";

const PRINCIPLES = [
  {
    title: "Permanence over Popularity",
    description: "Archives are built for 100 years, not 24 hours. We prioritize data structures that will remain readable as social platforms rise and fall.",
    icon: <ArchiveIcon className="h-6 w-6" />
  },
  {
    title: "Verifiable Integrity",
    description: "Every digital object in the vault is hashed with SHA-256. This ensures that the record you view today is bit-for-bit identical to the one you preserved years ago.",
    icon: <ShieldIcon className="h-6 w-6" />
  },
  {
    title: "Universal Portability",
    description: "Your archive belongs to you. Every export follows open standards, including original media, JSON manifests, and human-readable metadata sidecars.",
    icon: <DownloadIcon className="h-6 w-6" />
  },
  {
    title: "Rich Provenance",
    description: "A photo without context is just a file. We preserve the metadata—where it came from, when it was taken, and how it was verified.",
    icon: <CheckIcon className="h-6 w-6" />
  },
  {
    title: "The Human Texture",
    description: "We focus on 'lived experience'—the everyday moments that professional archives often miss, but families and communities cherish.",
    icon: <ArchiveIcon className="h-6 w-6" />
  }
];

export default function PrinciplesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pt-24 pb-32 md:px-12">
      <header className="mb-24 space-y-8">
        <Link href="/" className="archive-label transition-colors hover:text-foreground">
          ← Back to Overview
        </Link>
        <h1 className="font-serif text-5xl tracking-tight text-foreground md:text-7xl">
          Archival Principles
        </h1>
        <p className="text-xl font-medium leading-relaxed text-muted-foreground max-w-2xl">
          Tomorrow’s Archive is built on the belief that digital life is cultural heritage. 
          Our system is designed to turn fragile digital fragments into a durable record of lived experience.
        </p>
      </header>

      <div className="grid gap-16 md:grid-cols-2">
        {PRINCIPLES.map((p, i) => (
          <div key={i} className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-accent border border-surface-border">
              {p.icon}
            </div>
            <h3 className="font-serif text-3xl tracking-tight text-foreground">{p.title}</h3>
            <p className="text-[15px] font-medium leading-relaxed text-muted-foreground">
              {p.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-32 rounded-3xl border border-surface-border bg-surface/30 p-12 md:p-20 text-center">
         <h2 className="font-serif text-4xl text-foreground mb-6">Built for the long term.</h2>
         <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-12">
            We are not a startup looking for 'engagement'. We are a project dedicated to the technical and ethical challenge of long-term digital preservation.
         </p>
         <div className="flex justify-center gap-6">
            <Link href="/dashboard" className="archive-button">
                Begin Your Vault
            </Link>
         </div>
      </div>
    </div>
  );
}

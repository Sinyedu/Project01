import { Show, SignUpButton } from "@clerk/nextjs";
import { platformConfigs } from "@/core/config/platforms";
import { AnimatedHeading } from "@/app/components/ui/AnimatedHeading";
import { CaptureForm } from "@/app/components/ui/CaptureForm";
import { CapsuleForm } from "@/app/components/ui/CapsuleForm";
import { Section } from "@/app/components/layout/Section";
import { Footer } from "@/app/components/layout/Footer";
import { PlatformIcon, ArchiveIcon, LockIcon, ShieldIcon } from "@/app/components/ui/Icons";

const FEATURES = [
  {
    icon: <ArchiveIcon className="h-6 w-6" />,
    title: "Public Web Import",
    description:
      "Paste a public profile or page URL. We fetch, parse, and preserve the content, metadata, and media permanently.",
  },
  {
    icon: <LockIcon className="h-6 w-6" />,
    title: "Official Exports",
    description:
      "Upload your official data exports from Facebook, Instagram, X, and more. We turn raw files into a searchable memory archive.",
  },
  {
    icon: <ShieldIcon className="h-6 w-6" />,
    title: "Secure Archive",
    description:
      "Your digital history is stored with integrity. We preserve provenance, original files, and high-quality media assets.",
  },
];

export default function Home() {
  const platforms = Object.entries(platformConfigs) as [
    string,
    (typeof platformConfigs)[keyof typeof platformConfigs],
  ][];

  return (
    <>
      {/* ── Hero ── */}
      <section className="flex min-h-[90vh] flex-col items-center justify-center px-6 text-center">
        <AnimatedHeading
          as="h1"
          gradient
          className="mb-8 text-6xl font-black leading-none tracking-tighter sm:text-8xl"
        >
          Your Digital Legacy
        </AnimatedHeading>

        <p className="animate-fade-in-up delay-2 mb-12 max-w-2xl text-xl font-medium text-muted sm:text-2xl leading-relaxed">
          Import public pages and upload your official account exports into one unified, 
          private archive. Grounded, structured, and future-proof.
        </p>

        <div className="animate-fade-in-up delay-3 flex gap-6">
          <a
            href="#capture"
            className="rounded-full bg-accent px-8 py-4 font-bold text-black transition-transform hover:scale-105"
          >
            Start Your Archive
          </a>
          <a
            href="/dashboard"
            className="rounded-full border border-border px-8 py-4 font-bold text-muted transition-colors hover:text-white"
          >
            Go to Vault
          </a>
        </div>
      </section>

      {/* ── Platforms ── */}
      <Section
        id="platforms"
        className="py-32"
        title={<span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/80">Import Sources</span>}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map(([key, cfg], i) => (
            <div key={key} className="group relative rounded-3xl border border-border bg-surface p-8 transition-all hover:bg-surface-bright">
              <div className="mb-6 flex items-center justify-between">
                <PlatformIcon platform={key} className="h-8 w-8 transition-colors" style={{ color: cfg.color }} />
                <div
                  className="h-1 w-8 rounded-full opacity-40 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: cfg.color }}
                />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">{cfg.name}</h3>
              <p className="mt-2 text-[10px] text-muted uppercase tracking-[0.2em]">{cfg.supportedContentTypes.join(' · ')}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Features ── */}
      <Section
        id="features"
        className="py-32"
        title={<span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/60">Philosophy</span>}
      >
        <div className="grid gap-12 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="space-y-6">
              <div className="text-accent/60 transition-colors group-hover:text-accent">
                {f.icon}
              </div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted font-medium">{f.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Capture / Interaction ── */}
      <Section
        id="capture"
        className="py-32 border-t border-border/10"
        title={<span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted/60">Action</span>}
      >
        <div className="mx-auto max-w-2xl text-center">
          <Show when="signed-in">
            <div className="space-y-24">
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Public Import</h2>
                  <p className="text-sm text-muted">Paste a link to capture it forever.</p>
                </div>
                <CaptureForm />
              </div>
              <div className="h-px w-12 mx-auto bg-border/20" />
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Time Capsule</h2>
                  <p className="text-sm text-muted">Seal a message for the future.</p>
                </div>
                <CapsuleForm />
              </div>
            </div>
          </Show>
          <Show when="signed-out">
            <div className="flex flex-col items-center gap-8 py-12">
              <p className="text-xl text-muted font-medium">Join the effort to preserve the present.</p>
              <SignUpButton>
                <button className="rounded-full bg-accent px-10 py-4 font-black text-black transition-transform hover:scale-105">
                  Get started free
                </button>
              </SignUpButton>
            </div>
          </Show>
        </div>
      </Section>

      <Footer />
    </>
  );
}

import { Show, SignUpButton } from "@clerk/nextjs";
import { platformConfigs } from "@/core/config/platforms";
import { AnimatedHeading } from "@/app/components/ui/AnimatedHeading";
import { PlatformCard } from "@/app/components/ui/PlatformCard";
import { FeatureCard } from "@/app/components/ui/FeatureCard";
import { CaptureForm } from "@/app/components/ui/CaptureForm";
import { CapsuleForm } from "@/app/components/ui/CapsuleForm";
import { Section } from "@/app/components/layout/Section";
import { Footer } from "@/app/components/layout/Footer";

const FEATURES = [
  {
    icon: "📡",
    title: "Public Web Import",
    description:
      "Paste a public profile or page URL. We fetch, parse, and preserve the content, metadata, and media permanently.",
  },
  {
    icon: "📦",
    title: "Official Exports",
    description:
      "Upload your official data exports from Facebook, Instagram, X, and more. We turn raw files into a searchable memory archive.",
  },
  {
    icon: "🔒",
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
      <section className="flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        <AnimatedHeading
          as="h1"
          gradient
          className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-7xl"
        >
          Your Digital Legacy
        </AnimatedHeading>

        <p className="animate-fade-in-up delay-2 mb-4 text-3xl font-semibold sm:text-4xl">
          Preserved & Searchable
        </p>

        <p className="animate-fade-in-up delay-3 mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted">
          Import public pages and upload your official account exports into one unified, 
          private archive. BigApp keeps your memories alive — structured, grounded, and future-proof.
        </p>

        <div className="animate-fade-in-up delay-4 flex gap-4">
          <a
            href="#capture"
            className="rounded-full bg-accent px-6 py-3 font-semibold text-black transition-colors hover:bg-amber-400"
          >
            Start Your Archive
          </a>
          <a
            href="/dashboard"
            className="rounded-full border border-border px-6 py-3 font-semibold transition-colors hover:border-muted hover:text-white"
          >
            Go to Dashboard
          </a>
        </div>
      </section>

      {/* ── Platforms ── */}
      <Section
        id="platforms"
        title="Import from your favorite platforms"
        subtitle="We support official exports and public pages from the platforms where your digital life happens."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map(([key, cfg], i) => (
            <PlatformCard
              key={key}
              name={cfg.name}
              color={cfg.color}
              contentTypes={cfg.supportedContentTypes}
              index={i}
            />
          ))}
        </div>
      </Section>

      {/* ── Features ── */}
      <Section
        id="features"
        title="A Grounded Personal Archive"
        subtitle="Move beyond brittle live connections. Build a reliable, future-proof history."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </Section>

      {/* ── Capture ── */}
      <Section
        id="capture"
        title="Import a public page right now"
        subtitle="Paste a link. We'll extract the content, save the media, and preserve it."
      >
        <Show when="signed-in">
          <CaptureForm />
        </Show>
        <Show when="signed-out">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-muted">
              Sign in to start archiving the web.
            </p>
            <SignUpButton>
              <button className="cursor-pointer rounded-full bg-accent px-6 py-3 font-semibold text-black transition-colors hover:bg-amber-400">
                Get started free
              </button>
            </SignUpButton>
          </div>
        </Show>
      </Section>

      {/* ── Time Capsule ── */}
      <Section
        id="capsule"
        title="Send something to the future"
        subtitle="Write it now. Lock it away. Open it in 2030, 2050, or whenever you choose."
      >
        <Show when="signed-in">
          <CapsuleForm />
        </Show>
        <Show when="signed-out">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-muted">
              Sign in to create a time capsule.
            </p>
            <SignUpButton>
              <button className="cursor-pointer rounded-full bg-accent px-6 py-3 font-semibold text-black transition-colors hover:bg-amber-400">
                Get started free
              </button>
            </SignUpButton>
          </div>
        </Show>
      </Section>

      <Footer />
    </>
  );
}

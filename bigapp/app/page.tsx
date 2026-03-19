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
    title: "Instant Capture",
    description:
      "Paste a URL from any supported platform. We pull metadata via oEmbed, archive images to Cloudinary, and store everything permanently.",
  },
  {
    icon: "🔒",
    title: "Time Capsules",
    description:
      "Lock content away until a future date. A message to yourself in 2030, or a snapshot of right now for someone in 2075.",
  },
  {
    icon: "🩺",
    title: "Link Rot Detection",
    description:
      "We check your archived source URLs every week. When the original vanishes, your preserved copy lives on.",
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
          Preserve the present
        </AnimatedHeading>

        <p className="animate-fade-in-up delay-2 mb-4 text-3xl font-semibold sm:text-4xl">
          before it disappears
        </p>

        <p className="animate-fade-in-up delay-3 mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted">
          Social posts vanish. Communities dissolve. Local stories go untold.
          BigApp captures the living web and keeps it alive for decades —
          structured, searchable, and honest about what it is.
        </p>

        <div className="animate-fade-in-up delay-4 flex gap-4">
          <a
            href="#capture"
            className="rounded-full bg-accent px-6 py-3 font-semibold text-black transition-colors hover:bg-amber-400"
          >
            Start archiving
          </a>
          <a
            href="#platforms"
            className="rounded-full border border-border px-6 py-3 font-semibold transition-colors hover:border-muted hover:text-white"
          >
            Learn more
          </a>
        </div>
      </section>

      {/* ── Platforms ── */}
      <Section
        id="platforms"
        title="Capture from anywhere"
        subtitle="We pull metadata and content from the platforms where life actually happens."
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
        title="How it works"
        subtitle="Three layers that make sure nothing important gets lost."
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
        title="Archive something right now"
        subtitle="Paste a link. We'll extract metadata, save the media, and preserve it."
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

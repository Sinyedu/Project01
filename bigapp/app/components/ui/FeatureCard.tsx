interface Props {
  icon: string;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ icon, title, description, index }: Props) {
  return (
    <div
      className="animate-fade-in-up rounded-xl border border-border bg-surface p-8"
      style={{ animationDelay: `${(index + 1) * 100}ms` }}
    >
      <div className="mb-4 text-3xl">{icon}</div>
      <h3 className="mb-3 text-xl font-semibold">{title}</h3>
      <p className="leading-relaxed text-muted">{description}</p>
    </div>
  );
}

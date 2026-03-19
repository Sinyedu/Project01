interface Props {
  id?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ id, title, subtitle, children, className = "" }: Props) {
  return (
    <section id={id} className={`px-6 py-24 ${className}`}>
      <div className="mx-auto max-w-6xl">
        {title && (
          <h2 className="animate-fade-in-up mb-4 text-3xl font-bold sm:text-4xl">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="animate-fade-in-up delay-1 mb-12 max-w-2xl text-lg text-muted">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

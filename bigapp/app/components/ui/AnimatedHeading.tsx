interface Props {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  gradient?: boolean;
  className?: string;
  delay?: number;
}

export function AnimatedHeading({
  children,
  as: Tag = "h2",
  gradient,
  className = "",
  delay = 0,
}: Props) {
  return (
    <Tag
      className={`animate-fade-in-up ${gradient ? "gradient-text" : ""} ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

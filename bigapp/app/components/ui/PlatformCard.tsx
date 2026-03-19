"use client";

import { useState } from "react";

interface Props {
  name: string;
  color: string;
  contentTypes: string[];
  index: number;
}

export function PlatformCard({ name, color, contentTypes, index }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="animate-fade-in-up rounded-xl border bg-surface p-6 transition-colors"
      style={{
        animationDelay: `${(index + 1) * 100}ms`,
        borderColor: hovered ? color : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-lg font-semibold">{name}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {contentTypes.map((t) => (
          <span
            key={t}
            className="rounded-full bg-surface-bright px-2.5 py-1 text-xs text-muted"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

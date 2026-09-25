"use client";

import { cn } from "@/lib/client/utils";

const TONES = ["bg-ink text-paper", "bg-accent text-white", "bg-lime text-lime-ink", "bg-paper-3 text-ink", "bg-violet-soft text-violet"];

function toneFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 17 + key.charCodeAt(i)) % 101;
  return TONES[h % TONES.length];
}

/** Pastille d'initiales (membres, animateurs, experts). */
export function Avatar({ initials, size = 32, tone, className, ring }: { initials: string; size?: number; tone?: string; className?: string; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-extrabold tracking-[-0.02em]",
        tone ?? toneFor(initials),
        ring && "ring-2 ring-card",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

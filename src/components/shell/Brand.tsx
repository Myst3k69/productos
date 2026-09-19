import { cn } from "@/lib/client/utils";

/** Marque Atelier : un carré d'établi cousu d'une diagonale. */
export function BrandMark({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={cn("shrink-0", className)} aria-hidden>
      <rect x="2.5" y="2.5" width="27" height="27" rx="7" className="fill-ink" />
      <path d="M8 24 24 8" stroke="var(--paper)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="3.2 3.2" />
      <circle cx="22.5" cy="22.5" r="3.2" className="fill-accent" />
    </svg>
  );
}

export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      {!compact ? <span className="font-display text-[19px] font-bold tracking-[-0.03em] text-ink">Atelier</span> : null}
    </span>
  );
}

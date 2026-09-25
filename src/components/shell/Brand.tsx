import { cn } from "@/lib/client/utils";

/** Marque BuildOS : le monogramme « B/ » en carré d'encre. */
export function BrandMark({ className, size = 30, inverted }: { className?: string; size?: number; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={cn("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="5" className={inverted ? "fill-paper" : "fill-ink"} />
      <text
        x="6.2"
        y="23.2"
        className={inverted ? "fill-ink" : "fill-paper"}
        style={{ font: "900 17px var(--font-display)", letterSpacing: "-0.04em" }}
      >
        B/
      </text>
    </svg>
  );
}

export function Wordmark({ className, compact, tagline = true, inverted }: { className?: string; compact?: boolean; tagline?: boolean; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark inverted={inverted} />
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display text-[19px] font-extrabold tracking-[-0.04em]", inverted ? "text-paper" : "text-ink")}>BuildOS</span>
          {tagline ? <span className={cn("mt-[3px] text-[10.5px] font-medium", inverted ? "text-paper/60" : "text-ink-3")}>De l&apos;idée au réel.</span> : null}
        </span>
      ) : null}
    </span>
  );
}

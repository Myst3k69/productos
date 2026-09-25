import { cn } from "@/lib/client/utils";

type ArrowDir = "down-right" | "down-left" | "right" | "down" | "up-right";

/** Flèche tracée au feutre. */
export function HandArrow({ dir = "down-right", className }: { dir?: ArrowDir; className?: string }) {
  const paths: Record<ArrowDir, { d: string; head: string }> = {
    "down-right": { d: "M6 8 C 18 30, 34 40, 58 44", head: "M46 36 L 59 44 L 45 51" },
    "down-left": { d: "M58 6 C 50 26, 36 38, 10 46", head: "M22 36 L 9 46 L 23 53" },
    right: { d: "M4 30 C 20 18, 38 18, 58 26", head: "M46 16 L 59 26 L 45 34" },
    down: { d: "M30 4 C 22 18, 38 30, 30 54", head: "M21 44 L 30 56 L 38 43" },
    "up-right": { d: "M6 50 C 20 34, 34 20, 56 10", head: "M42 6 L 57 9 L 50 23" },
  };
  const p = paths[dir];
  return (
    <svg viewBox="0 0 64 60" className={cn("h-12 w-12", className)} fill="none" aria-hidden>
      <path d={p.d} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d={p.head} stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Note manuscrite en capitales, légèrement pivotée. */
export function HandNote({ children, rotate = -6, className }: { children: React.ReactNode; rotate?: number; className?: string }) {
  return (
    <p className={cn("font-hand text-[17px] uppercase leading-[1.15] text-ink", className)} style={{ transform: `rotate(${rotate}deg)` }}>
      {children}
    </p>
  );
}

import { cn } from "@/lib/client/utils";

/** Classes de boutons-liens utilisables côté serveur (la landing n'importe pas `buttonVariants`, module client). */
const base =
  "group/cta inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-[background-color,color,box-shadow,transform,border-color] duration-150 active:translate-y-px";

const variants = {
  ink: "bg-ink text-paper hover:bg-ink/85 shadow-[0_10px_24px_-14px_rgba(11,11,12,0.7)]",
  primary: "bg-accent text-white hover:bg-accent-ink shadow-[0_10px_24px_-14px_var(--accent-glow)]",
  secondary: "border border-line-3 bg-card text-ink hover:border-ink",
  ghostInverse: "border border-paper/25 text-paper hover:border-paper hover:bg-paper/5",
  paper: "bg-paper text-ink hover:bg-paper-2",
  lime: "bg-lime text-lime-ink hover:brightness-95",
} as const;

const sizes = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[14px]",
  lg: "h-[52px] px-6 text-[15px]",
} as const;

export function cta(variant: keyof typeof variants = "ink", size: keyof typeof sizes = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

/** Flèche qui glisse au survol du bouton parent. */
export const ctaArrow = "h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5";

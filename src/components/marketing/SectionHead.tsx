import { cn } from "@/lib/client/utils";
import { RV, d } from "./reveal";

/** En-tête de section : pastille orange « 01 », étiquette mono, grand titre serré. */
export function SectionHead({
  n,
  label,
  title,
  lead,
  inverse,
  className,
  titleClassName,
  id,
}: {
  n?: string;
  label: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  inverse?: boolean;
  className?: string;
  titleClassName?: string;
  id?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <div data-reveal className={cn(RV, "flex items-center gap-3")}>
        {n ? <span className="section-badge">{n}</span> : null}
        <span className={cn("font-mono text-[11px] font-semibold uppercase tracking-[0.14em]", inverse ? "text-paper/70" : "text-ink-2")}>{label}</span>
      </div>
      <h2
        id={id}
        data-reveal
        style={d(1)}
        className={cn(
          RV,
          "mt-4 text-balance font-display text-[38px] font-black leading-[0.95] tracking-[-0.045em] sm:text-[52px] lg:text-[60px]",
          inverse ? "text-paper" : "text-ink",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {lead ? (
        <p data-reveal style={d(2)} className={cn(RV, "mt-5 max-w-xl text-pretty text-[16px] leading-relaxed sm:text-[17px]", inverse ? "text-paper/70" : "text-ink-2")}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}

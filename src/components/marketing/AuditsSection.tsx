import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { healthFor } from "@/lib/buildos/fixtures";
import { cn } from "@/lib/client/utils";
import { HandArrow, HandNote } from "./HandNote";
import { SectionHead } from "./SectionHead";
import { Sparkline } from "./Sparkline";
import { cta, ctaArrow } from "./cta";
import { RV, d } from "./reveal";

export function AuditsSection() {
  const metrics = healthFor(3).slice(0, 4);
  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-line bg-card p-6 shadow-card sm:p-9">
      <SectionHead
        id="audits-title"
        n="05"
        label="Audits & analytics"
        title={
          <>
            Des applications plus saines,
            {" "}sur le long terme.
          </>
        }
        titleClassName="lg:text-[46px] xl:text-[48px]"
        lead="Suivez les performances, la qualité et la sécurité de vos applications, et recevez des audits réguliers avec des recommandations concrètes — transformables en tâches en un clic."
      />

      <div data-reveal style={d(3)} className={`${RV} mt-7 flex flex-wrap items-end justify-between gap-4`}>
        <Link href="/audits" className={cta("ink", "md")}>
          Voir un exemple d&apos;audit
          <ArrowRight className={ctaArrow} aria-hidden />
        </Link>
        <div className="hidden items-end gap-1 sm:flex">
          <HandNote rotate={-7} className="text-right text-[15px]">
            Mesurer, améliorer,
            <br />
            durablement
          </HandNote>
          <HandArrow dir="down" className="mb-[-30px] h-10 w-10" />
        </div>
      </div>

      <ul className="mt-auto grid grid-cols-2 gap-2.5 pt-9 xl:grid-cols-4">
        {metrics.map((m, i) => {
          const down = m.delta.startsWith("−") || m.delta.startsWith("-");
          const invert = m.key === "latency" || m.key === "errors" || m.key === "debt";
          return (
            <li key={m.key} data-reveal style={d(i)} className={`${RV} flex min-w-0 flex-col rounded-xl border border-line-2 bg-card p-3.5`}>
              <span className="truncate text-[11.5px] text-ink-3">{m.label}</span>
              <span className="mt-1 font-display text-[24px] font-black tracking-[-0.04em] text-ink">{m.value}</span>
              <span className={cn("mt-1 inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-[2px] font-mono text-[10.5px] font-semibold", m.good ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger")}>
                {down ? <TrendingDown className="h-3 w-3" aria-hidden /> : <TrendingUp className="h-3 w-3" aria-hidden />}
                {m.delta}
              </span>
              <Sparkline data={m.trend} invert={invert} className="mt-3 text-ok" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

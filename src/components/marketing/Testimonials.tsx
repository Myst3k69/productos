import { Star } from "lucide-react";
import { cn } from "@/lib/client/utils";
import { SectionHead } from "./SectionHead";
import { RV, d } from "./reveal";

const QUOTES = [
  {
    quote:
      "J'avais un fichier Excel et une conviction. Onze jours plus tard, mes premiers clients réservaient en ligne. L'IA m'a posé les questions que je n'avais pas pensé à me poser.",
    name: "Sarah Mercier",
    initials: "SM",
    role: "Fondatrice · Maison Tilleul, chambres d'hôtes",
    metric: "11 jours",
    metricLabel: "de l'idée au premier client",
    tone: "lime" as const,
  },
  {
    quote:
      "Je route l'API vers Claude Code, les écrans vers Cursor, les tests vers Copilot. BuildOS fait l'aiguillage, je fais la revue. J'ai l'impression d'avoir une équipe de cinq.",
    name: "Yanis Haddad",
    initials: "YH",
    role: "Développeur solo · Relevé, SaaS comptable",
    metric: "×5",
    metricLabel: "fonctionnalités livrées par mois",
    tone: "ink" as const,
  },
  {
    quote:
      "Pour convaincre notre comité, il fallait un pilote sérieux. Les audits de sécurité et la revue humaine à chaque étape ont fait toute la différence face à la DSI.",
    name: "Hélène Garnier",
    initials: "HG",
    role: "Responsable innovation · groupe de distribution",
    metric: "3 semaines",
    metricLabel: "pour un pilote validé",
    tone: "accent" as const,
  },
];

const RESULTS = [
  { v: "11 j", l: "en moyenne de l'idée au premier utilisateur" },
  { v: "92 %", l: "des tâches validées au premier passage" },
  { v: "−64 %", l: "de coûts de développement estimés" },
  { v: "4,9/5", l: "note moyenne des fondateurs" },
];

export function Testimonials() {
  return (
    <section aria-labelledby="quotes-title" className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <SectionHead
        id="quotes-title"
        label="Ils construisent avec BuildOS"
        title={
          <>
            Des fondateurs qui <span className="marker-highlight">livrent</span>.
          </>
        }
      />
      <ul className="mt-12 grid gap-4 lg:grid-cols-3">
        {QUOTES.map((q, i) => (
          <li
            key={q.name}
            data-reveal
            style={d(i)}
            className={cn(RV, "flex min-w-0 flex-col rounded-2xl border border-line-2 bg-card p-6 sm:p-7", i === 1 && "lg:-translate-y-4 lg:data-in:-translate-y-4")}
          >
            <div className="flex items-center justify-between">
              <span className="flex gap-0.5 text-accent" aria-label="5 étoiles sur 5">
                {Array.from({ length: 5 }, (_, k) => (
                  <Star key={k} className="h-3.5 w-3.5 fill-current" aria-hidden />
                ))}
              </span>
              <span aria-hidden className="font-display text-[64px] font-black leading-[0.5] text-line-3">
                «
              </span>
            </div>
            <blockquote className="mt-5 text-pretty text-[16px] leading-relaxed text-ink">{q.quote}</blockquote>
            <div className="mt-6 rounded-xl bg-paper-2 px-4 py-3">
              <span className="font-display text-[30px] font-black tracking-[-0.05em] text-ink">{q.metric}</span>
              <span className="ml-2 text-[12.5px] text-ink-2">{q.metricLabel}</span>
            </div>
            <div className="mt-auto flex items-center gap-3 pt-6">
              <span
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold",
                  q.tone === "lime" ? "bg-lime text-lime-ink" : q.tone === "ink" ? "bg-ink text-paper" : "bg-accent text-white",
                )}
                aria-hidden
              >
                {q.initials}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[14px] font-semibold text-ink">{q.name}</span>
                <span className="block truncate text-[12.5px] text-ink-3" title={q.role}>
                  {q.role}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line-2 bg-line-2 lg:grid-cols-4">
        {RESULTS.map((r, i) => (
          <div key={r.l} data-reveal style={d(i)} className={`${RV} bg-card p-5 sm:p-6`}>
            <dt className="sr-only">{r.l}</dt>
            <dd className="font-display text-[34px] font-black leading-none tracking-[-0.05em] text-ink sm:text-[44px]">{r.v}</dd>
            <dd className="mt-2 text-[13px] leading-snug text-ink-3">{r.l}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11.5px] text-ink-4">Témoignages et chiffres illustratifs issus du prototype.</p>
    </section>
  );
}

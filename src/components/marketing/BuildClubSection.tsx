import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, CalendarDays, FlaskConical, MapPin, MessagesSquare, UserRoundCheck, Users } from "lucide-react";
import { CLUB_EVENTS, defaultJourney } from "@/lib/buildos/fixtures";
import type { ClubEventKind } from "@/lib/buildos/types";
import { cn } from "@/lib/client/utils";
import { HandArrow, HandNote } from "./HandNote";
import { SectionHead } from "./SectionHead";
import { cta, ctaArrow } from "./cta";
import { RV, d } from "./reveal";

const PILLARS = [
  { w: "Apprendre", s: "Ateliers pratiques, méthodes éprouvées." },
  { w: "Tester", s: "Labs, retours croisés, vrais utilisateurs." },
  { w: "Partager", s: "Build in public, entraide, victoires." },
  { w: "Construire", s: "Avec BuildOS, du premier jour au lancement." },
];

const STATS = [
  { v: "1 200+", l: "membres actifs" },
  { v: "150+", l: "ateliers par an" },
  { v: "4,9/5", l: "satisfaction" },
];

const OFFERS = [
  { icon: CalendarDays, t: "Ateliers", s: "Chaque semaine, en ligne et à Lyon." },
  { icon: FlaskConical, t: "Labs", s: "Build, Produit, Growth, Automatisation." },
  { icon: UserRoundCheck, t: "Experts à la demande", s: "CTO, PM, growth, juridique — 30 min suffisent." },
  { icon: MessagesSquare, t: "Communauté", s: "Des fondateurs qui livrent, tous les jours." },
];

const KIND_LABEL: Record<ClubEventKind, string> = {
  atelier: "Atelier",
  lab: "Lab",
  live: "Live",
  startupweek: "StartupWeek",
  office_hours: "Office hours",
};

export function BuildClubSection() {
  const events = CLUB_EVENTS.filter((e) => e.kind !== "startupweek").slice(0, 4);
  const sw = CLUB_EVENTS.find((e) => e.kind === "startupweek");
  const journey = defaultJourney();

  return (
    <section id="build-club" aria-labelledby="club-title" className="relative scroll-mt-20 border-y border-line bg-paper-2 py-20 lg:py-28">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHead
            id="club-title"
            label="Build Club — la communauté"
            title={
              <>
                Vous ne construisez
                <br />
                pas <span className="marker-underline">seul.</span>
              </>
            }
            lead="BuildOS est né au Build Club : une communauté d'entrepreneurs qui apprennent, testent et livrent ensemble. Votre abonnement vous y ouvre les portes."
          />
          <div data-reveal style={d(2)} className={`${RV} hidden items-end gap-1 lg:flex`}>
            <HandNote rotate={-7} className="text-[17px]">
              Seul on va vite,
              <br />
              ensemble on livre.
            </HandNote>
            <HandArrow dir="down-right" className="mb-[-24px] h-11 w-11" />
          </div>
        </div>

        {/* piliers */}
        <ul className="mt-14 grid grid-cols-2 border-t border-ink lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <li
              key={p.w}
              data-reveal
              style={d(i)}
              className={cn(
                RV,
                "group border-b border-line-2 py-6 pr-3 lg:border-b-0",
                i % 2 === 1 && "border-l pl-4",
                i === 2 && "lg:border-l",
                i > 0 && "lg:pl-5",
              )}
            >
              <span className="font-mono text-[10.5px] text-ink-3">0{i + 1}</span>
              <p className="mt-1 font-display text-[28px] font-black tracking-[-0.045em] text-ink sm:text-[40px]">
                <span className="transition-[background-size] duration-500 [background:linear-gradient(transparent_58%,var(--lime)_58%,var(--lime)_92%,transparent_92%)_no-repeat_0_0/0%_100%] group-hover:[background-size:100%_100%]">
                  {p.w}
                </span>
              </p>
              <p className="mt-1 text-[13px] leading-snug text-ink-2">{p.s}</p>
            </li>
          ))}
        </ul>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
          <div className="min-w-0">
            <dl className="grid grid-cols-3 gap-3">
              {STATS.map((s, i) => (
                <div key={s.l} data-reveal style={d(i)} className={`${RV} rounded-xl border border-line-2 bg-card p-3 sm:p-4`}>
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="whitespace-nowrap font-display text-[23px] font-black leading-none tracking-[-0.05em] text-ink sm:text-[38px]">{s.v}</dd>
                  <dd className="mt-2 text-[12px] leading-tight text-ink-3">{s.l}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {OFFERS.map((o, i) => (
                <li key={o.t} data-reveal style={d(i)} className={`${RV} flex gap-3 rounded-xl bg-card p-4`}>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-paper">
                    <o.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-ink">{o.t}</span>
                    <span className="block text-[12.5px] leading-snug text-ink-3">{o.s}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div data-reveal style={d(2)} className={`${RV} mt-7 flex flex-wrap gap-3`}>
              <Link href="/club" className={cta("ink", "md")}>
                Rejoindre le Build Club
                <ArrowRight className={ctaArrow} aria-hidden />
              </Link>
              <Link href="/club" className={cta("secondary", "md")}>
                Voir le programme
              </Link>
            </div>
          </div>

          <div data-reveal style={d(1)} className={`${RV} min-w-0 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[20px] font-extrabold tracking-[-0.03em] text-ink">Prochains événements</h3>
              <Link href="/club" className="text-[12.5px] font-semibold text-accent-ink hover:underline">
                Tout voir
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {events.map((e) => {
                const date = new Date(e.date);
                const low = e.seatsLeft <= 10;
                return (
                  <li key={e.id} className="group flex items-center gap-4 py-3.5">
                    <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-line-2 bg-card-2 transition-colors group-hover:border-ink">
                      <span className="font-display text-[20px] font-black leading-none tracking-[-0.04em]" suppressHydrationWarning>
                        {format(date, "d", { locale: fr })}
                      </span>
                      <span className="mt-0.5 font-mono text-[9.5px] uppercase text-ink-3" suppressHydrationWarning>
                        {format(date, "MMM", { locale: fr })}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                        <span className="rounded-[4px] bg-paper-2 px-1.5 py-[1px] text-ink-2">{KIND_LABEL[e.kind]}</span>
                        <span suppressHydrationWarning>{format(date, "EEEE HH:mm", { locale: fr })}</span>
                      </span>
                      <span className="mt-1 block truncate text-[14px] font-semibold text-ink" title={e.title}>
                        {e.title}
                      </span>
                      <span className="block truncate text-[12px] text-ink-3">
                        {e.host} · {e.location}
                        {low ? <span className="text-accent-ink"> · plus que {e.seatsLeft} places</span> : null}
                      </span>
                    </span>
                    <span className={cn("hidden shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold sm:inline-flex", e.price === 0 ? "bg-lime text-lime-ink" : "bg-paper-2 text-ink")}>
                      {e.price === 0 ? "Gratuit" : `${e.price} €`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* encart StartupWeek */}
        <div data-reveal className={`${RV} relative mt-14 overflow-hidden rounded-2xl bg-ink p-6 text-paper sm:p-10`}>
          <span aria-hidden className="halftone pointer-events-none absolute inset-0 text-paper/15 [mask-image:linear-gradient(100deg,transparent_35%,black)]" />
          <span aria-hidden className="pointer-events-none absolute -right-6 -top-10 font-display text-[220px] font-black leading-none tracking-[-0.08em] text-paper/[0.06] sm:text-[300px]">
            7J
          </span>
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end">
            <div>
              <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/60">
                <span className="inline-flex h-5 items-center rounded-[4px] bg-accent px-1.5 text-white">StartupWeek</span>
                Le format intensif
              </p>
              <h3 className="mt-4 font-display text-[36px] font-black leading-[0.95] tracking-[-0.045em] sm:text-[52px]">
                7 jours pour lancer
                <br />
                votre MVP.
              </h3>
              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-paper/75">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden /> Prochaine session le 9 novembre
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden /> Lyon
                </span>
                {sw ? (
                  <span className="inline-flex items-center gap-1.5 text-lime">
                    <Users className="h-4 w-4" aria-hidden /> Plus que {sw.seatsLeft} places
                  </span>
                ) : null}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/club" className={cta("lime", "md")}>
                  Réserver ma place
                  <ArrowRight className={ctaArrow} aria-hidden />
                </Link>
                <span className="inline-flex items-center text-[13px] text-paper/60">BuildOS Builder inclus pendant 3 mois</span>
              </div>
            </div>
            <ol className="grid grid-cols-7 gap-1.5" aria-label="Programme des 7 jours">
              {journey.map((j) => (
                <li
                  key={j.id}
                  className="group relative flex min-h-[132px] flex-col justify-between rounded-lg border border-paper/15 bg-paper/[0.04] p-2 transition-colors hover:border-lime hover:bg-lime hover:text-lime-ink sm:p-2.5"
                  title={`${j.title} — ${j.outcome}`}
                >
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] opacity-70">J{j.day}</span>
                  <span className="text-[10.5px] font-semibold leading-tight sm:text-[12px] [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0">
                    {j.title}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

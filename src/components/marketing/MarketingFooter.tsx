import Link from "next/link";
import { Heart } from "lucide-react";
import { Wordmark } from "@/components/shell/Brand";

const COLS: { title: string; links: { l: string; href: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { l: "Aperçu", href: "#produit" },
      { l: "Agents de code", href: "/agents" },
      { l: "Livrables", href: "/deliverables" },
      { l: "Mise en production", href: "/releases" },
      { l: "Audits", href: "/audits" },
      { l: "Tarifs", href: "#tarifs" },
    ],
  },
  {
    title: "Communauté",
    links: [
      { l: "Build Club", href: "/club" },
      { l: "Ateliers et labs", href: "/club" },
      { l: "Experts à la demande", href: "/club" },
      { l: "StartupWeek", href: "/club" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { l: "Voir la démo", href: "/demo" },
      { l: "Cas d'usage", href: "#cas-usage" },
      { l: "Questions fréquentes", href: "#faq" },
      { l: "Guide : écrire une bonne spec", href: "/club" },
    ],
  },
  {
    title: "Légal",
    links: [
      { l: "Mentions légales", href: "#" },
      { l: "Confidentialité", href: "#" },
      { l: "Conditions générales", href: "#" },
      { l: "Sécurité et RGPD", href: "#" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-paper-2">
      <div className="mx-auto max-w-[1320px] px-4 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
          <div>
            <Wordmark />
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-ink-2">
              Le système d&apos;exploitation des entrepreneurs pour créer et faire évoluer des applications avec l&apos;IA.
            </p>
            <p className="mt-6 inline-block font-hand text-[16px] uppercase text-ink" style={{ transform: "rotate(-3deg)" }}>
              Build what&apos;s next<span className="text-accent">*</span>
            </p>
          </div>
          <nav aria-label="Pied de page" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.title}>
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-3">{c.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.l}>
                      {l.href.startsWith("/") ? (
                        <Link href={l.href} className="text-[13.5px] text-ink-2 transition-colors hover:text-ink">
                          {l.l}
                        </Link>
                      ) : (
                        <a href={l.href} className="text-[13.5px] text-ink-2 transition-colors hover:text-ink">
                          {l.l}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line-2 py-6 text-[12.5px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 BuildOS · Lyon, France</p>
          <p className="flex items-center gap-1.5">
            Fait avec <Heart className="h-3.5 w-3.5 fill-accent text-accent" aria-label="amour" /> par le Build Club
          </p>
        </div>
      </div>
      <p
        aria-hidden
        className="pointer-events-none select-none whitespace-nowrap px-2 text-center font-display text-[25vw] font-black leading-[0.72] tracking-[-0.07em] text-ink/[0.05] lg:text-[22vw]"
      >
        BuildOS
      </p>
    </footer>
  );
}

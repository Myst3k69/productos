import Link from "next/link";
import { Wordmark } from "@/components/shell/Brand";
import { supabaseConfigured } from "@/lib/supabase/config";

/** Mise en page des écrans d'authentification : formulaire à gauche, promesse BuildOS à droite. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" className="inline-flex w-fit rounded-md" aria-label="BuildOS, retour à l'accueil">
          <Wordmark />
        </Link>
        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="reveal font-display text-[34px] font-extrabold leading-[0.95] tracking-[-0.04em] text-ink sm:text-[40px]">{title}</h1>
          <p className="reveal mt-3 text-[14.5px] leading-relaxed text-ink-2" style={{ "--i": 1 } as React.CSSProperties}>
            {subtitle}
          </p>
          <div className="reveal mt-8" style={{ "--i": 2 } as React.CSSProperties}>
            {supabaseConfigured ? children : <NotConfigured />}
          </div>
          {footer ? (
            <div className="reveal mt-8 text-[13px] text-ink-3" style={{ "--i": 3 } as React.CSSProperties}>
              {footer}
            </div>
          ) : null}
        </main>
        <p className="text-[11.5px] text-ink-4">© BuildOS · Build Club · StartupWeek</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="halftone pointer-events-none absolute inset-0 text-paper/[0.06]" aria-hidden />
        <p className="relative font-mono text-[11px] uppercase tracking-[0.14em] text-paper/60">De l&apos;idée à la production</p>
        <div className="relative">
          <p className="font-display text-[46px] font-black leading-[0.95] tracking-[-0.04em]">
            Vous décrivez.
            <br />
            L&apos;IA construit.
            <br />
            <span className="text-accent">Vous validez.</span>
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-[14px] text-paper/80">
            <li className="flex gap-3">
              <span className="section-badge">01</span> Vos projets, vos tâches et vos fondations, sauvegardés et partagés avec votre équipe.
            </li>
            <li className="flex gap-3">
              <span className="section-badge">02</span> Une IA qui cadre, planifie, fabrique et contrôle — vous gardez la main.
            </li>
            <li className="flex gap-3">
              <span className="section-badge">03</span> Le Build Club : ateliers, labs, experts et StartupWeek.
            </li>
          </ul>
        </div>
        <div className="relative flex justify-end">
          <span className="sticky-lime rotate-[-3deg] font-hand text-[15px]">MOINS DE FRICTION, PLUS DE CRÉATION</span>
        </div>
      </aside>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <p className="text-[14px] font-semibold text-ink">Les comptes ne sont pas activés sur cette instance.</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
        Renseignez <code className="font-mono text-[12px]">NEXT_PUBLIC_SUPABASE_URL</code> et <code className="font-mono text-[12px]">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> pour activer
        l&apos;inscription. En attendant, la démo fonctionne entièrement dans votre navigateur.
      </p>
      <Link href="/home" className="mt-4 inline-flex h-9 items-center rounded-md bg-ink px-3.5 text-[13.5px] font-semibold text-paper hover:bg-ink/85">
        Ouvrir la démo
      </Link>
    </div>
  );
}

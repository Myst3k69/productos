import { Asterisk } from "lucide-react";

const AGENTS = ["Claude Code", "Codex", "Cursor", "GitHub Copilot", "Devin"];
const STACK = ["Next.js", "Supabase", "Stripe", "Vercel", "Postgres", "Resend"];

function Row() {
  return (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/60">Compatible avec vos agents</span>
      {AGENTS.map((a) => (
        <span key={a} className="flex items-center gap-8">
          <span className="font-display text-[26px] font-black tracking-[-0.04em] text-paper sm:text-[32px]">{a}</span>
          <Asterisk className="h-5 w-5 text-accent" strokeWidth={3} aria-hidden />
        </span>
      ))}
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/60">Et votre stack</span>
      {STACK.map((s) => (
        <span key={s} className="flex items-center gap-8">
          <span className="font-display text-[26px] font-bold tracking-[-0.03em] text-paper/55 sm:text-[32px]">{s}</span>
          <span className="h-2 w-2 rounded-full bg-lime" aria-hidden />
        </span>
      ))}
    </div>
  );
}

/** Bandeau défilant : agents compatibles + stack. */
export function AgentsMarquee() {
  return (
    <section aria-label="Agents et outils compatibles" className="relative overflow-hidden border-y border-ink bg-ink py-5">
      <p className="sr-only">
        Compatible avec vos agents : {AGENTS.join(", ")}. Et votre stack : {STACK.join(", ")}.
      </p>
      <div aria-hidden className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        <Row />
        <Row />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent" />
    </section>
  );
}

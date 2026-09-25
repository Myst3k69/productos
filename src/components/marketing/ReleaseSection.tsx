"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CodeXml, FlaskConical, Rocket, UserCheck } from "lucide-react";
import { WorkingDots } from "@/components/ui/misc";
import { cn } from "@/lib/client/utils";
import { SectionHead } from "./SectionHead";

const STAGES = [
  { icon: CodeXml, title: "Développement", short: "Code", sub: "par l'agent" },
  { icon: UserCheck, title: "Revue humaine", short: "Revue", sub: "Code, sécurité, qualité" },
  { icon: FlaskConical, title: "Préproduction", short: "Préprod", sub: "Tests et validation" },
  { icon: Rocket, title: "Production", short: "En ligne", sub: "Mise en ligne" },
];

const DURATION = [2400, 5200, 2400, 3200];

export function ReleaseSection() {
  const [step, setStep] = useState(0);
  const [validated, setValidated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setStep((s) => {
        const next = (s + 1) % 4;
        if (next === 0) setValidated(false);
        return next;
      });
    }, DURATION[step]);
    return () => clearTimeout(t);
  }, [step, visible]);

  const approve = () => {
    setValidated(true);
    setStep(2);
  };

  return (
    <div ref={ref} className="flex h-full flex-col rounded-2xl border border-line bg-card p-6 shadow-card sm:p-9">
      <SectionHead
        id="release-title"
        n="04"
        label="Revue humaine → préprod → production"
        title="Vous gardez le contrôle."
        titleClassName="lg:text-[46px] xl:text-[48px]"
        lead="Chaque étape clé est revue par un humain avant de passer en préproduction, puis en production. Rien ne part en ligne sans votre accord."
      />

      <ol className="relative mt-10 grid grid-cols-4 gap-1" aria-label="Étapes de mise en production">
        {/* rail */}
        <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[27px] h-[2px] bg-line-2" />
        <span
          aria-hidden
          className="absolute left-[12.5%] top-[27px] h-[2px] bg-ink transition-[width] duration-700 ease-out-expo"
          style={{ width: `${(step / 3) * 75}%` }}
        />
        {STAGES.map((s, i) => {
          const done = i < step;
          const current = i === step;
          const last = i === 3;
          return (
            <li key={s.title} className="relative flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
              <span
                className={cn(
                  "relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] transition-all duration-500",
                  last
                    ? cn("border-accent bg-accent text-white", current && "scale-110 shadow-[0_0_0_8px_var(--accent-glow)]")
                    : current
                      ? cn("scale-110 border-ink bg-ink text-paper", i === 1 && "pulse-ring")
                      : done
                        ? "border-ink bg-card text-ink"
                        : "border-line-3 bg-card text-ink-3",
                )}
              >
                {done && !last ? <Check className="h-5 w-5" strokeWidth={2.6} aria-hidden /> : <s.icon className="h-5 w-5" aria-hidden />}
              </span>
              <span className={cn("mt-3 text-[12.5px] font-semibold leading-tight sm:text-[13.5px]", current || done ? "text-ink" : "text-ink-3")}>
                <span className="sm:hidden">{s.short}</span>
                <span className="hidden sm:inline">{s.title}</span>
              </span>
              <span className="mt-0.5 hidden text-[11.5px] leading-tight text-ink-3 sm:block">{s.sub}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 rounded-xl border border-line-2 bg-card-2 p-4" aria-live="polite">
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
          <span>v0.4.0</span>
          <span aria-hidden>·</span>
          <span className="truncate normal-case tracking-normal">Paiement en ligne et page tarifs</span>
        </div>
        <div key={step} className="reveal-fast mt-2.5 flex min-h-[40px] flex-wrap items-center gap-x-3 gap-y-2 text-[13.5px] text-ink">
          {step === 0 ? (
            <>
              <WorkingDots />
              <span>
                <b className="font-semibold text-ai-ink">Claude Code</b> développe et teste la fonctionnalité…
              </span>
            </>
          ) : step === 1 ? (
            <>
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent animate-blink" aria-hidden />
              <span className="font-semibold">En attente de votre validation</span>
              <button
                type="button"
                onClick={approve}
                className="ml-auto inline-flex h-8 items-center gap-1 rounded-md bg-accent px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-ink"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> Valider
              </button>
            </>
          ) : step === 2 ? (
            <>
              <Check className="h-4 w-4 text-ok" strokeWidth={3} aria-hidden />
              <span>
                {validated ? "Validé par vous. " : "Validé. "}
                Préprod : <b className="font-semibold">142 tests passés</b>, lien partagé à 3 testeurs.
              </span>
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 text-accent" aria-hidden />
              <span>
                En ligne sur <span className="font-mono text-[12.5px]">hotel-lumiere.buildos.app</span> · surveillance 24 h active
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

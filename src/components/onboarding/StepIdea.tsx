"use client";

import * as React from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { APP_TYPE_META, guessAppType } from "@/lib/buildos/generate";
import { cn } from "@/lib/client/utils";
import { StepHeading } from "./StepHeading";
import { IDEA_EXAMPLES, type StepProps } from "./draft";

const rv = (i: number) => ({ "--i": i }) as React.CSSProperties;

export const IDEA_MIN = 12;

export function StepIdea({ draft, update, index, returning }: StepProps & { returning: boolean }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const len = draft.idea.trim().length;
  const detected = len >= IDEA_MIN ? guessAppType(draft.idea) : null;
  const firstName = draft.name.trim().split(/\s+/)[0];

  const setIdea = (idea: string) => {
    // Nouvelle idée : les réponses de l'assistant et le brief seront à refaire.
    update((d) => (d.idea === idea ? {} : { idea, chat: {}, brief: null, briefSource: "", generatedFor: "" }));
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  return (
    <div className="flex flex-col gap-7">
      <StepHeading
        index={index}
        eyebrow={returning && firstName ? `Ravi de vous revoir, ${firstName}` : "Votre idée"}
        title={
          returning ? (
            <>
              Quel est le <span className="marker-underline">prochain</span> projet ?
            </>
          ) : (
            <>
              Racontez-nous votre <span className="marker-underline">idée</span>.
            </>
          )
        }
        lead="Décrivez ce que vous voulez construire, comme à un ami. Pas besoin de jargon : l'IA s'occupe de structurer."
      />

      <div className="reveal relative" style={rv(3)}>
        <label htmlFor="onb-idea" className="sr-only">
          Votre idée
        </label>
        <textarea
          id="onb-idea"
          ref={ref}
          value={draft.idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Par exemple : je veux une application qui permet aux hôtels indépendants de prendre des réservations en direct, sans commission…"
          rows={7}
          maxLength={1500}
          className="block min-h-[210px] w-full resize-y rounded-xl border-[1.5px] border-ink bg-card px-5 py-4 text-[17px] leading-relaxed text-ink shadow-brutal placeholder:text-ink-4 focus:outline-none focus:ring-4 focus:ring-accent/20"
        />
        <div className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-2 text-[11.5px] text-ink-4">
          <span className="num font-mono">{draft.idea.length}/1500</span>
        </div>
      </div>

      <div className="reveal flex min-h-[28px] flex-wrap items-center justify-between gap-3" style={rv(4)}>
        <p aria-live="polite" className="flex items-center gap-2 text-[13px] text-ink-3">
          {detected ? (
            <>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-ai-soft px-2.5 text-[12px] font-semibold text-ai-ink">
                <Sparkles className="h-3 w-3" aria-hidden />
                L&apos;IA pense à : {APP_TYPE_META[detected].label}
              </span>
              <span className="hidden sm:inline">{APP_TYPE_META[detected].hint}</span>
            </>
          ) : len > 0 ? (
            <span>Encore quelques mots…</span>
          ) : (
            <span>Quelques phrases suffisent.</span>
          )}
        </p>
      </div>

      <div className="reveal flex flex-col gap-2.5" style={rv(5)}>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Besoin d&apos;inspiration ?</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {IDEA_EXAMPLES.map((ex) => {
            const active = draft.idea === ex.idea;
            return (
              <button
                key={ex.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setIdea(ex.idea);
                  ref.current?.focus({ preventScroll: true });
                }}
                className={cn(
                  "group flex min-h-[44px] items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-left text-[13.5px] font-medium transition-colors",
                  active ? "border-ink bg-ink text-paper" : "border-line-2 bg-card text-ink-2 hover:border-ink hover:text-ink",
                )}
              >
                <span>{ex.label}</span>
                <ArrowUpRight className={cn("h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5", active ? "text-lime" : "text-ink-4")} aria-hidden />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

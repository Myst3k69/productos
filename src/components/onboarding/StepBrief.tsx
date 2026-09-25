"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { APP_TYPE_META } from "@/lib/buildos/generate";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/client/utils";
import { StepHeading } from "./StepHeading";
import { NAME_SUGGESTIONS, vocab, type AppType, type BriefDraft, type StepProps } from "./draft";

const rv = (i: number) => ({ "--i": i }) as React.CSSProperties;

function Label({ children, htmlFor, right }: { children: React.ReactNode; htmlFor?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        {children}
      </label>
      {right}
    </div>
  );
}

export function StepBrief({ draft, update, simple, index }: StepProps) {
  const brief = draft.brief;
  const [newFeature, setNewFeature] = React.useState("");
  const words = vocab(simple);
  if (!brief) return null;

  const set = (patch: Partial<BriefDraft>) => update((d) => (d.brief ? { brief: { ...d.brief, ...patch } } : {}));
  const setFeatures = (fn: (f: string[]) => string[]) => update((d) => (d.brief ? { brief: { ...d.brief, features: fn(d.brief.features) } } : {}));
  const move = (i: number, dir: -1 | 1) =>
    setFeatures((f) => {
      const j = i + dir;
      if (j < 0 || j >= f.length) return f;
      const next = [...f];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const addFeature = () => {
    const t = newFeature.trim();
    if (!t) return;
    setFeatures((f) => (f.includes(t) ? f : [...f, t]));
    setNewFeature("");
  };
  const names = NAME_SUGGESTIONS[brief.appType].filter((n) => n !== brief.projectName);

  return (
    <div className="flex flex-col gap-7">
      <StepHeading
        index={index}
        eyebrow="Votre brief"
        title={
          <>
            Voici votre <span className="marker-underline">brief</span>.
          </>
        }
        lead="L'IA a tout mis au propre. Relisez, corrigez, réordonnez : c'est la base de vos fondations et de chaque tâche confiée aux agents."
      />

      <div className="reveal relative flex flex-col gap-6 rounded-xl border-[1.5px] border-ink bg-card p-5 shadow-brutal sm:p-6" style={rv(3)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="brief-name">Nom du projet</Label>
          <input
            id="brief-name"
            value={brief.projectName}
            onChange={(e) => set({ projectName: e.target.value })}
            maxLength={60}
            placeholder="Nom de votre projet"
            className="w-full border-b-2 border-line-2 bg-transparent pb-1 font-display text-[34px] font-black leading-tight tracking-[-0.045em] text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
          />
          {names.length ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
              <span>Autres idées :</span>
              {names.map((n) => (
                <button key={n} type="button" onClick={() => set({ projectName: n })} className="inline-flex h-7 items-center rounded-full border border-line-2 px-2.5 font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink">
                  {n}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="brief-pitch">Pitch en une phrase</Label>
          <Textarea id="brief-pitch" value={brief.pitch} onChange={(e) => set({ pitch: e.target.value })} rows={2} maxLength={280} className="min-h-[64px] text-[15px] font-medium" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="brief-audience">Pour qui</Label>
            <Input id="brief-audience" value={brief.audience} onChange={(e) => set({ audience: e.target.value })} maxLength={140} className="h-10" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="brief-problem">Problème n°1</Label>
            <Input id="brief-problem" value={brief.problem} onChange={(e) => set({ problem: e.target.value })} maxLength={200} className="h-10" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Type d&apos;application</Label>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type d'application">
            {(Object.keys(APP_TYPE_META) as AppType[]).map((t) => {
              const on = brief.appType === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={APP_TYPE_META[t].hint}
                  onClick={() => set({ appType: t })}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
                    on ? "border-ink bg-ink text-paper" : "border-line-2 bg-card text-ink-2 hover:border-ink hover:text-ink",
                  )}
                >
                  {APP_TYPE_META[t].label}
                </button>
              );
            })}
          </div>
          <p className="text-[12px] text-ink-3">{APP_TYPE_META[brief.appType].hint}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label right={<span className="num font-mono text-[11px] text-ink-4">{brief.features.length}</span>}>{words.featuresTitle}</Label>
          <ol className="flex flex-col gap-1.5" aria-label={words.featuresTitle}>
            {brief.features.map((f, i) => (
              <li key={i}className="group flex items-center gap-2 rounded-md border border-line-2 bg-card-2 py-1 pl-2 pr-1 transition-colors focus-within:border-line-3 hover:border-line-3">
                <span className="num inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-ink font-mono text-[11px] font-bold text-paper">{i + 1}</span>
                <input
                  value={f}
                  aria-label={`${words.featuresTitle} ${i + 1}`}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFeatures((list) => list.map((x, j) => (j === i ? v : x)));
                  }}
                  className="h-8 min-w-0 flex-1 bg-transparent text-[14px] font-medium text-ink focus:outline-none"
                />
                {i < 3 ? <span className="hidden shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-accent-ink sm:inline">v1</span> : null}
                <div className="flex shrink-0 items-center">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Monter « ${f} »`} className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-3 hover:bg-paper-3 hover:text-ink disabled:opacity-25">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === brief.features.length - 1}
                    aria-label={`Descendre « ${f} »`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-3 hover:bg-paper-3 hover:text-ink disabled:opacity-25"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setFeatures((list) => list.filter((_, j) => j !== i))} aria-label={`Retirer « ${f} »`} className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-3 hover:bg-danger-soft hover:text-danger">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex items-center gap-2">
            <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFeature();
                }
              }}
              placeholder={simple ? "Ajouter quelque chose que l'application doit faire…" : "Ajouter une fonctionnalité…"}
              aria-label="Nouvelle fonctionnalité"
              maxLength={80}
              className="h-9"
            />
            <button type="button" onClick={addFeature} disabled={!newFeature.trim()} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-line-2 bg-card px-3 text-[13px] font-semibold text-ink hover:border-ink disabled:opacity-40">
              <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter
            </button>
          </div>
          {brief.features.length === 0 ? <p className="text-[12px] text-danger">Gardez au moins une fonctionnalité.</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="brief-constraints">Contraintes</Label>
          <Textarea
            id="brief-constraints"
            value={brief.constraints}
            onChange={(e) => set({ constraints: e.target.value })}
            rows={2}
            maxLength={500}
            placeholder="Budget, délai, paiement, RGPD… (facultatif)"
            className="min-h-[60px]"
          />
        </div>

        <span aria-hidden className="sticky-lime pointer-events-none absolute -right-2 -top-4 hidden rotate-[5deg] rounded-[3px] px-2.5 py-1 text-[13px] leading-none sm:block">
          RÉDIGÉ PAR L&apos;IA, VALIDÉ PAR VOUS
        </span>
      </div>
    </div>
  );
}

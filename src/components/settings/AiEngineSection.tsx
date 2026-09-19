"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import type { AppSettings } from "@/lib/domain/types";
import { useStore } from "@/lib/client/store";
import { clamp, cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Input, Segmented, Select } from "@/components/ui/input";
import { WorkingDots } from "@/components/ui/misc";
import { Section, SettingsCard } from "./Section";
import { SettingRow } from "./SettingRow";
import { Stepper } from "./Stepper";
import { Meta } from "./Meta";
import { AUTH_LABELS, AUTO_FIX_OPTIONS, EFFORT_OPTIONS, ENGINE_OPTIONS, MODEL_OPTIONS, effortLabel, modelOption } from "./options";
import { useSaveSettings } from "./useSaveSettings";

interface Probe {
  ok: boolean;
  detail: string;
  model?: string;
  latencyMs?: number;
}

function formatMs(ms: number): string {
  return `${Math.round(ms).toLocaleString("fr-FR")} ms`;
}

export function AiEngineSection({ index }: { index: number }) {
  const settings = useStore((s) => s.settings);
  const ai = useStore((s) => s.ai);
  const testAI = useStore((s) => s.testAI);
  const save = useSaveSettings();
  const [testing, setTesting] = useState(false);
  const [probe, setProbe] = useState<Probe | null>(null);

  const available = ai?.available ?? false;
  const isMock = ai?.engine === "mock";
  const running = (ai?.running.length ?? 0) > 0;
  const title = !ai ? "Moteur en attente" : isMock ? "Mode démo" : available ? "Claude connecté" : "Claude indisponible";
  const dot = !ai ? "bg-ink-4" : available ? "bg-ok" : "bg-danger";
  const engine = ENGINE_OPTIONS.find((o) => o.value === settings.engine) ?? ENGINE_OPTIONS[0];
  const effort = EFFORT_OPTIONS.find((o) => o.value === settings.effort) ?? EFFORT_OPTIONS[2];
  const model = modelOption(settings.model);

  const runTest = async () => {
    setTesting(true);
    setProbe(null);
    try {
      const r = await testAI();
      setProbe(r);
      if (r.ok) toast.success("Connexion vérifiée", { description: [r.model ?? settings.model, r.latencyMs ? formatMs(r.latencyMs) : null].filter(Boolean).join(" · ") });
      else toast.error("Connexion impossible", { description: r.detail });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Test impossible.";
      setProbe({ ok: false, detail });
      toast.error(detail);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Section index={index} title="Moteur IA" id="moteur">
      {/* État */}
      <div className="card-surface rounded-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative mt-[7px] inline-flex h-2.5 w-2.5 shrink-0" aria-hidden>
              <span className={cn("absolute inset-0 rounded-full", dot)} />
              {available && running ? <span className={cn("absolute inset-0 rounded-full opacity-60 animate-breathe", dot)} /> : null}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-display text-[17px] font-bold leading-tight tracking-[-0.01em] text-ink">{title}</h3>
                {running ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-ai-ink">
                    <WorkingDots />
                    {ai?.running.length} en cours
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3 text-pretty">{ai?.detail ?? "Récupération du statut…"}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" loading={testing} onClick={() => void runTest()} className="shrink-0 self-start">
            {!testing ? <Zap className="h-3.5 w-3.5 text-accent" /> : null}
            {testing ? "Test en cours…" : "Tester la connexion"}
          </Button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
          <Meta label="Modèle">
            <span className="block truncate font-mono text-[12.5px]" title={ai?.model ?? settings.model}>
              {ai?.model ?? settings.model}
            </span>
          </Meta>
          <Meta label="Effort">{effortLabel(ai?.effort ?? settings.effort)}</Meta>
          <Meta label="Authentification">{ai ? AUTH_LABELS[ai.authMethod] : "—"}</Meta>
          <Meta label="Parallélisme">
            <span className="num font-mono text-[12.5px]">
              {ai?.running.length ?? 0} / {ai?.concurrency ?? settings.concurrency}
            </span>
            {ai?.queued.length ? <span className="ml-1.5 text-[12px] text-ink-3">· {ai.queued.length} en file</span> : null}
          </Meta>
        </dl>

        {probe ? (
          <div
            role="status"
            className={cn(
              "reveal-fast mt-4 flex flex-col gap-1 rounded-lg border px-3.5 py-2.5 text-[12.5px] sm:flex-row sm:items-center sm:justify-between",
              probe.ok ? "border-ok/25 bg-ok-soft/60 text-ok" : "border-danger/25 bg-danger-soft/60 text-danger",
            )}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              {probe.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate text-ink-2" title={probe.detail}>
                {probe.detail}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-3 font-mono text-[11.5px] text-ink-3">
              {probe.model ? <span>{probe.model}</span> : null}
              {probe.latencyMs ? <span className="num">{formatMs(probe.latencyMs)}</span> : null}
            </span>
          </div>
        ) : null}
      </div>

      {/* Réglages */}
      <SettingsCard>
        <SettingRow label="Moteur" hint={engine.hint}>
          <Segmented<AppSettings["engine"]> size="sm" value={settings.engine} onChange={(v) => void save({ engine: v }, `Moteur : ${ENGINE_OPTIONS.find((o) => o.value === v)?.label ?? v}`)} options={ENGINE_OPTIONS.map((o) => ({ value: o.value, label: o.label, title: o.hint }))} />
        </SettingRow>

        <SettingRow label="Modèle" hint={model.hint} htmlFor="ai-model">
          <div className="w-full sm:w-[300px]">
            <Select id="ai-model" value={settings.model} onChange={(e) => void save({ model: e.target.value }, `Modèle : ${e.target.value}`)} className="font-mono text-[12.5px]">
              {MODEL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} — {m.tag}
                </option>
              ))}
              {!MODEL_OPTIONS.some((m) => m.value === settings.model) ? <option value={settings.model}>{settings.model}</option> : null}
            </Select>
          </div>
        </SettingRow>

        <SettingRow label="Effort de réflexion" hint={effort.hint}>
          <Segmented<AppSettings["effort"]> size="sm" value={settings.effort} onChange={(v) => void save({ effort: v }, `Effort : ${effortLabel(v)}`)} options={EFFORT_OPTIONS.map((o) => ({ value: o.value, label: o.label, title: o.hint }))} className="flex-wrap" />
        </SettingRow>

        <SettingRow label="Parallélisme" hint="Nombre de tâches que l'IA fabrique en même temps. Au-delà, les tâches attendent en file.">
          <Stepper label="Parallélisme" value={settings.concurrency} min={1} max={8} onChange={(v) => void save({ concurrency: v }, `${v} tâche${v > 1 ? "s" : ""} en parallèle`)} format={(v) => `${v} tâche${v > 1 ? "s" : ""}`} />
        </SettingRow>

        <SettingRow label="Budget par tâche" hint="Plafond de dépense au-delà duquel l'IA s'arrête et signale un échec relançable. Entre 0,50 $ et 200 $." htmlFor="ai-budget">
          <BudgetInput value={settings.maxBudgetUsdPerTask} onCommit={(v) => void save({ maxBudgetUsdPerTask: v }, `Budget : ${v.toFixed(2).replace(".", ",")} $ par tâche`)} />
        </SettingRow>

        <SettingRow label="Boucles d'auto-correction" hint="Si le contrôle échoue, l'IA peut corriger et recontrôler d'elle-même avant de vous solliciter.">
          <Segmented<string>
            size="sm"
            value={String(clamp(settings.maxAutoFixLoops, 0, 3))}
            onChange={(v) => void save({ maxAutoFixLoops: Number(v) }, Number(v) === 0 ? "Aucune boucle d'auto-correction" : `${v} boucle${Number(v) > 1 ? "s" : ""} d'auto-correction`)}
            options={AUTO_FIX_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
          />
        </SettingRow>
      </SettingsCard>
    </Section>
  );
}

function BudgetInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const n = Number.parseFloat(text.replace(",", "."));
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const next = Math.round(clamp(n, 0.5, 200) * 100) / 100;
    setText(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <div className="relative w-[136px]">
      <Input
        id="ai-budget"
        type="number"
        inputMode="decimal"
        min={0.5}
        max={200}
        step={0.5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        aria-label="Budget par tâche en dollars"
        className="num pr-8 text-right font-mono text-[13px]"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-3" aria-hidden>
        $
      </span>
    </div>
  );
}

"use client";

import * as React from "react";
import { toast } from "sonner";
import { addDays, format, isFriday, nextFriday } from "date-fns";
import { CalendarDays, ChevronDown, Eye, Lightbulb, Sparkles, Tag, X } from "lucide-react";
import { useStore, useCurrentProject, useProjectLabels } from "@/lib/client/store";
import type { Autonomy, Priority, TaskType } from "@/lib/domain/types";
import { AUTONOMY_LEVELS, AUTONOMY_META, PRIORITIES, PRIORITY_META, TASK_TYPES, TASK_TYPE_META } from "@/lib/domain/types";
import { STAGES, STAGE_META, type Stage } from "@/lib/domain/stages";
import { guessTaskType } from "@/lib/domain/helpers";
import { cn, humanDay, modKey, plural } from "@/lib/client/utils";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip, FilterChip } from "@/components/ui/chip";
import { Field, Input, Segmented, Select, Switch, Textarea } from "@/components/ui/input";
import { Kbd } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { PriorityMark, TypeIcon, stageTone } from "@/components/shared/task-bits";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { insertTemplate, isOnlyTemplate, templateOutline, wordCount } from "./templates";

/**
 * Composeur de tâche — l'entrée principale du produit.
 * « J'ajoute une tâche avec ses spécifications, l'IA prend la main. »
 * Un brouillon entamé n'est jamais perdu par mégarde : Échap, clic dehors ou « Annuler » demandent confirmation.
 */
export function NewTaskDialog() {
  const open = useStore((s) => s.composerOpen);
  const closeComposer = useStore((s) => s.closeComposer);
  const dirtyRef = React.useRef<() => boolean>(() => false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const requestClose = React.useCallback(() => {
    if (dirtyRef.current()) setConfirmOpen(true);
    else closeComposer();
  }, [closeComposer]);

  React.useEffect(() => {
    if (!open) setConfirmOpen(false);
  }, [open]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) requestClose();
        }}
      >
        {open ? <ComposerContent dirtyRef={dirtyRef} onCancel={requestClose} /> : null}
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Abandonner cette tâche ?"
        description="Le titre et la spécification que vous avez saisis seront perdus."
        confirmLabel="Abandonner"
        cancelLabel="Continuer la rédaction"
        onConfirm={() => {
          setConfirmOpen(false);
          closeComposer();
        }}
      />
    </>
  );
}

const MIN_TITLE = 3;

function cascade(i: number): React.CSSProperties {
  return { "--i": i } as React.CSSProperties;
}

function isoDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/* Le contenu est monté à chaque ouverture : l'état repart du brouillon fourni. */
function ComposerContent({ dirtyRef, onCancel }: { dirtyRef: React.RefObject<() => boolean>; onCancel: () => void }) {
  const draft = useStore((s) => s.composerDraft);
  const project = useCurrentProject();
  const projectLabels = useProjectLabels();
  const createTask = useStore((s) => s.createTask);
  const closeComposer = useStore((s) => s.closeComposer);

  const [title, setTitle] = React.useState(draft?.title ?? "");
  const [spec, setSpec] = React.useState(draft?.spec ?? "");
  const [typeOverride, setTypeOverride] = React.useState<TaskType | null>(draft?.type ?? null);
  const [typeRowOpen, setTypeRowOpen] = React.useState(false);
  const [priority, setPriority] = React.useState<Priority>(draft?.priority ?? "medium");
  const [dueDate, setDueDate] = React.useState<string | null>(draft?.dueDate ?? null);
  const [labels, setLabels] = React.useState<string[]>(draft?.labels ?? []);
  const [labelInput, setLabelInput] = React.useState("");
  const [autonomy, setAutonomy] = React.useState<Autonomy | "">(draft?.autonomy ?? "");
  const [startNow, setStartNow] = React.useState(draft?.startNow ?? true);
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const titleRef = React.useRef<HTMLInputElement>(null);
  const specRef = React.useRef<HTMLTextAreaElement>(null);
  const labelRef = React.useRef<HTMLInputElement>(null);

  /* ── Dérivés ── */
  const text = `${title} ${spec}`.trim();
  const detected: TaskType | null = text ? guessTaskType(text) : null;
  const type: TaskType = typeOverride ?? detected ?? "other";
  const projectAutonomy: Autonomy = project?.autonomy ?? "autopilot";
  const effectiveAutonomy: Autonomy = autonomy || projectAutonomy;
  const manual = effectiveAutonomy === "manual";
  const willStart = startNow && !manual;
  const words = wordCount(spec);
  const specEmpty = isOnlyTemplate(spec);
  const titleTooShort = title.trim().length < MIN_TITLE;
  const titleError = touched && titleTooShort ? `Donnez un titre d'au moins ${MIN_TITLE} caractères.` : null;
  const gates: Stage[] = effectiveAutonomy === "plan_gate" ? ["plan", "review"] : ["review"];

  /* Brouillon entamé ? Sert à confirmer avant de fermer sans créer. */
  const dirty = title.trim().length > 0 || !isOnlyTemplate(spec) || labels.length > 0;
  React.useEffect(() => {
    dirtyRef.current = () => dirty && !submitting;
    return () => {
      dirtyRef.current = () => false;
    };
  }, [dirtyRef, dirty, submitting]);

  const today = new Date();
  const quickDates = [
    { label: "Aujourd'hui", value: isoDay(today) },
    { label: "Demain", value: isoDay(addDays(today, 1)) },
    { label: "J+3", value: isoDay(addDays(today, 3)) },
    { label: "Fin de semaine", value: isoDay(isFriday(today) ? today : nextFriday(today)) },
  ];

  const suggestions = projectLabels.filter((l) => !labels.includes(l) && (!labelInput || l.includes(labelInput.trim().toLowerCase()))).slice(0, 6);

  /* ── Actions ── */
  const addLabel = (raw: string) => {
    const l = raw.trim().replace(/,+$/, "").toLowerCase();
    if (!l) return;
    setLabels((prev) => (prev.includes(l) ? prev : [...prev, l]));
    setLabelInput("");
  };
  const removeLabel = (l: string) => setLabels((prev) => prev.filter((x) => x !== l));

  const applyTemplate = (t: TaskType) => {
    const next = insertTemplate(spec, t);
    setSpec(next);
    if (typeOverride === null) setTypeOverride(t);
    requestAnimationFrame(() => {
      const el = specRef.current;
      if (!el) return;
      el.focus();
      // curseur sous le premier titre du gabarit inséré
      const start = spec.trimEnd() ? spec.trimEnd().length + 2 : 0;
      const firstBreak = next.indexOf("\n", start);
      const pos = firstBreak === -1 ? next.length : firstBreak + 1;
      el.setSelectionRange(pos, pos);
    });
  };

  const submit = async () => {
    setTouched(true);
    if (titleTooShort) {
      titleRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const task = await createTask({
        title: title.trim(),
        spec: spec.trim(),
        type,
        priority,
        autonomy: autonomy || null,
        dueDate,
        labels,
        startNow: willStart,
      });
      const { selectTask } = useStore.getState();
      closeComposer();
      if (willStart) {
        selectTask(task.id, "activity");
        toast(`L'IA prend la main sur « ${task.title} »`, {
          description: "Cadrage en cours. Vous validez à l'étape 6.",
          action: { label: "Suivre", onClick: () => useStore.getState().selectTask(task.id, "activity") },
        });
      } else {
        toast(`« ${task.title} » ajoutée à « À faire »`, {
          description: manual ? "Mode manuel : lancez-la quand vous le souhaitez." : "Confiez-la à l'IA quand vous serez prêt.",
          action: { label: "Ouvrir", onClick: () => useStore.getState().selectTask(task.id, "spec") },
        });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Impossible de créer la tâche.");
      setSubmitting(false);
    }
  };

  const onFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      void submit();
      return;
    }
    /* Pas de soumission implicite depuis un champ simple (date, étiquette…) : seul Ctrl/⌘+Entrée crée la tâche. */
    if ((e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
  };

  return (
    <DialogContent
      size="lg"
      className="flex max-h-[86vh] flex-col overflow-hidden"
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        titleRef.current?.focus();
      }}
      onKeyDown={onFormKeyDown}
    >
      <DialogHeader className="pb-4 pt-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <DialogTitle className="font-display text-[17px] font-bold tracking-[-0.02em]">Nouvelle tâche</DialogTitle>
          {project ? (
            <Chip tone="outline" size="sm" className="max-w-[240px]">
              <span aria-hidden>{project.emoji}</span>
              <span className="truncate">{project.name}</span>
            </Chip>
          ) : null}
        </div>
        <DialogDescription className="mt-1 text-[12.5px] text-ink-3">Décrivez ce que vous voulez obtenir. L'IA cadre, planifie, fabrique et contrôle ; vous validez.</DialogDescription>
      </DialogHeader>

      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <DialogBody className="min-h-0 flex-1 space-y-5 overflow-y-auto scrollbar-thin py-5">
          {/* ── Titre ── */}
          <div className="reveal" style={cascade(0)}>
            <div
              className={cn(
                "relative border-b pb-1 transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:origin-left after:scale-x-0 after:transition-transform after:duration-200 after:ease-out focus-within:after:scale-x-100",
                titleError ? "border-danger after:bg-danger" : "border-line after:bg-accent",
              )}
            >
              <Input
                ref={titleRef}
                id="composer-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    specRef.current?.focus();
                  }
                }}
                placeholder="Ex. : Page tarifs avec trois formules"
                maxLength={200}
                autoComplete="off"
                spellCheck
                aria-label="Titre de la tâche"
                aria-invalid={titleError ? true : undefined}
                aria-describedby={titleError ? "composer-title-error" : undefined}
                className="h-12 rounded-none border-0 bg-transparent px-0 font-display text-[18px] font-semibold tracking-[-0.01em] shadow-none placeholder:font-medium placeholder:text-ink-4 focus:border-transparent focus:ring-0"
                /* Le focus est signalé par le soulignement accent du conteneur ; le contour global ferait une boîte. */
                style={{ outline: "none" }}
              />
            </div>
            <div className="mt-2 flex min-h-5 items-center justify-between gap-3">
              {titleError ? (
                <p id="composer-title-error" className="text-[12px] text-danger reveal-fast">
                  {titleError}
                </p>
              ) : (
                <TypeDetector type={type} detected={detected} forced={typeOverride !== null} open={typeRowOpen} onToggle={() => setTypeRowOpen((v) => !v)} />
              )}
            </div>
            {typeRowOpen ? (
              <div className="mt-2 flex flex-wrap gap-1.5 reveal-fast" role="group" aria-label="Type de tâche">
                <FilterChip active={typeOverride === null} onClick={() => setTypeOverride(null)} title="Laisser BuildOS détecter le type d'après le titre et la spec">
                  <Sparkles className="h-3.5 w-3.5" />
                  Automatique
                </FilterChip>
                {TASK_TYPES.map((t) => {
                  const isDetected = typeOverride === null && detected === t;
                  return (
                    <FilterChip
                      key={t}
                      active={typeOverride === t}
                      onClick={() => setTypeOverride(typeOverride === t ? null : t)}
                      title={TASK_TYPE_META[t].hint}
                      className={cn(isDetected && "border-ai/50 text-ai-ink")}
                    >
                      <TypeIcon type={t} />
                      {TASK_TYPE_META[t].label}
                    </FilterChip>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* ── Spécification ── */}
          <div className="reveal" style={cascade(1)}>
            <div className="flex items-end justify-between gap-3">
              <label htmlFor="composer-spec" className="text-[12.5px] font-semibold text-ink-2">
                Spécification <span className="font-normal text-ink-4">· Markdown accepté</span>
              </label>
              <span className={cn("font-mono text-[11px] num transition-colors", words ? "text-ink-3" : "text-ink-4")} aria-live="polite">
                {words} {plural(words, "mot")}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-4">Modèles</span>
              {TASK_TYPES.map((t) => (
                <Tooltip key={t} content={templateOutline(t)} delay={200}>
                  <button
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className={cn(
                      "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11.5px] font-medium transition-colors",
                      t === type ? "border-ai/40 bg-ai-soft/60 text-ai-ink hover:border-ai/70" : "border-line-2 bg-card text-ink-2 hover:border-line-3 hover:text-ink",
                    )}
                  >
                    <TypeIcon type={t} className="h-3 w-3" />
                    {TASK_TYPE_META[t].label}
                  </button>
                </Tooltip>
              ))}
            </div>

            <Textarea
              ref={specRef}
              id="composer-spec"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              rows={10}
              spellCheck
              placeholder={"Objectif, comportement attendu, contraintes, critères d'acceptation…\nOu partez d'un modèle ci-dessus."}
              className="mt-2 min-h-[220px] text-[13.5px] leading-[1.6] [tab-size:2]"
            />

            {specEmpty ? (
              <p className="mt-2 flex items-start gap-1.5 text-[12px] text-ink-3 reveal-fast">
                <Lightbulb className="mt-[2px] h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
                <span>
                  <span className="font-medium text-ink-2">Brouillon rapide possible.</span> Plus la spec est précise, moins l'IA posera de questions au cadrage.
                </span>
              </p>
            ) : null}
          </div>

          {/* ── Priorité · Échéance ── */}
          <div className="grid gap-5 md:grid-cols-2 reveal" style={cascade(2)}>
            <Field label="Priorité">
              <Segmented
                value={priority}
                onChange={setPriority}
                size="sm"
                className="w-full justify-between [&>button]:flex-1 [&>button]:justify-center"
                options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, icon: <PriorityMark priority={p} /> }))}
              />
            </Field>

            <Field label="Échéance" hint={dueDate ? `Pour ${humanDay(dueDate)}.` : "Facultative. Utile pour la vue Semaine."}>
              <div className="flex flex-wrap items-center gap-1.5">
                {quickDates.map((q) => (
                  <FilterChip key={q.label} active={dueDate === q.value} onClick={() => setDueDate(dueDate === q.value ? null : q.value)} className="h-6 px-2 text-[12px]">
                    {q.label}
                  </FilterChip>
                ))}
                <div className="relative ml-auto">
                  <CalendarDays className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
                  <Input
                    type="date"
                    aria-label="Date d'échéance"
                    value={dueDate ?? ""}
                    onChange={(e) => setDueDate(e.target.value || null)}
                    className={cn("h-7 w-[150px] pl-7 text-[12.5px]", dueDate ? "pr-7" : "pr-2")}
                  />
                  {dueDate ? (
                    <button type="button" aria-label="Effacer l'échéance" onClick={() => setDueDate(null)} className="absolute right-1.5 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-ink-3 hover:bg-paper-3 hover:text-ink">
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>
          </div>

          {/* ── Étiquettes · Autonomie ── */}
          <div className="grid gap-5 md:grid-cols-2 reveal" style={cascade(3)}>
            <Field label="Étiquettes" hint={labels.length ? undefined : "Entrée ou virgule pour valider."}>
              <div
                className="flex min-h-9 cursor-text flex-wrap items-center gap-1.5 rounded-md border border-line-2 bg-card px-2 py-1.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25"
                onClick={() => labelRef.current?.focus()}
              >
                <Tag className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                {labels.map((l) => (
                  <Chip key={l} tone="neutral" size="sm" className="pr-1">
                    {l}
                    <button
                      type="button"
                      aria-label={`Retirer l'étiquette ${l}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLabel(l);
                      }}
                      className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-ink-3 hover:bg-paper-3 hover:text-ink"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Chip>
                ))}
                <input
                  ref={labelRef}
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      if (e.metaKey || e.ctrlKey) return;
                      e.preventDefault();
                      addLabel(labelInput);
                    } else if (e.key === "Backspace" && !labelInput && labels.length) {
                      setLabels((prev) => prev.slice(0, -1));
                    }
                  }}
                  onBlur={() => {
                    if (labelInput.trim()) addLabel(labelInput);
                  }}
                  placeholder={labels.length ? "Ajouter…" : "Ex. : landing, api, pitch"}
                  aria-label="Ajouter une étiquette"
                  autoComplete="off"
                  className="min-w-[110px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-4"
                />
              </div>
              {suggestions.length ? (
                <div className="flex flex-wrap items-center gap-1" aria-label="Étiquettes du projet">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => addLabel(s)} className="inline-flex h-5 items-center rounded-full px-2 text-[11px] text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink">
                      + {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </Field>

            <Field label="Autonomie" hint={AUTONOMY_META[effectiveAutonomy].hint} htmlFor="composer-autonomy">
              <Select id="composer-autonomy" value={autonomy} onChange={(e) => setAutonomy(e.target.value as Autonomy | "")}>
                <option value="">Comme le projet ({AUTONOMY_META[projectAutonomy].label})</option>
                {AUTONOMY_LEVELS.map((a) => (
                  <option key={a} value={a}>
                    {AUTONOMY_META[a].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* ── Confier à l'IA ── */}
          <div
            className={cn(
              "flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors reveal",
              willStart ? "border-ai/30 bg-ai-soft/50" : "border-line bg-paper-2/60",
            )}
            style={cascade(4)}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <Sparkles className={cn("h-3.5 w-3.5", willStart ? "text-ai" : "text-ink-3")} aria-hidden />
                Confier à l'IA immédiatement
              </p>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {manual
                  ? "Indisponible en mode manuel : rien ne démarre sans que vous cliquiez « Lancer »."
                  : willStart
                    ? "Le cadrage démarre dès la création. Vous gardez la main sur la validation."
                    : "La tâche attend dans « À faire ». Vous la confierez à l'IA quand vous voudrez."}
              </p>
            </div>
            <Switch checked={willStart} disabled={manual} onCheckedChange={setStartNow} label="Confier à l'IA immédiatement" />
          </div>
        </DialogBody>

        <DialogFooter className="flex-wrap justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <ol className="flex flex-wrap items-center gap-1" aria-label="Étapes du pipeline">
              {STAGES.map((s, i) => {
                const meta = STAGE_META[s];
                const tone = stageTone(s);
                const gate = gates.includes(s);
                return (
                  <li key={s} className="flex items-center gap-1">
                    {i > 0 ? <span className="h-px w-1.5 bg-line-2" aria-hidden /> : null}
                    <Tooltip content={`${meta.index}. ${meta.label} — ${meta.hint}`} delay={250}>
                      <span
                        className={cn(
                          "inline-flex h-[18px] items-center gap-1 rounded-full px-1.5 text-[10px] font-medium leading-none",
                          gate
                            ? "bg-accent-soft text-accent-ink font-semibold"
                            : tone === "ai"
                              ? willStart
                                ? "bg-ai-soft text-ai-ink"
                                : "bg-paper-3 text-ink-3"
                              : tone === "ok"
                                ? "bg-ok-soft text-ok"
                                : "bg-paper-3 text-ink-3",
                        )}
                      >
                        <span className="font-mono text-[9px] opacity-70">{meta.index}</span>
                        {meta.short}
                      </span>
                    </Tooltip>
                  </li>
                );
              })}
            </ol>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
              <Eye className="h-3 w-3 text-accent" aria-hidden />
              {effectiveAutonomy === "plan_gate" ? "Vous validez le plan à l'étape 3, puis le résultat à l'étape 6." : "Vous validez à l'étape 6."}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {submitError ? (
              <span role="alert" className="max-w-[260px] truncate text-[12px] text-danger" title={submitError}>
                {submitError}
              </span>
            ) : null}
            <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" variant={willStart ? "ai" : "secondary"} loading={submitting} className={cn(willStart && "pl-3")}>
              {willStart && !submitting ? <Sparkles className="h-3.5 w-3.5" aria-hidden /> : null}
              {willStart ? "Créer et confier à l'IA" : "Créer"}
              <span className="ml-1 inline-flex gap-0.5" aria-hidden>
                <Kbd className={cn(willStart && "border-white/25 bg-white/15 text-white/90")}>{modKey()}</Kbd>
                <Kbd className={cn(willStart && "border-white/25 bg-white/15 text-white/90")}>↵</Kbd>
              </span>
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** Pastille « Détecté : Code » — cliquable pour forcer le type. */
function TypeDetector({ type, detected, forced, open, onToggle }: { type: TaskType; detected: TaskType | null; forced: boolean; open: boolean; onToggle: () => void }) {
  const meta = TASK_TYPE_META[type];
  /* Quatre états : forcé par vous, détecté d'après le texte, rien de probant (« Autre »), ou rien saisi. */
  const state: "forced" | "detected" | "vague" | "empty" = forced ? "forced" : detected === null ? "empty" : detected === "other" ? "vague" : "detected";
  const label = state === "forced" ? `Type : ${meta.label}` : state === "detected" ? `Détecté : ${meta.label}` : state === "vague" ? "Type : Autre" : "Type détecté à la saisie";
  const hint = state === "empty" ? "D'après le titre et la spécification." : state === "vague" ? "Précisez-le : l'IA cadrera mieux." : meta.hint;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title="Changer le type"
        className={cn(
          "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11.5px] font-medium transition-colors",
          state === "forced"
            ? "border-ink bg-ink text-paper hover:bg-ink-2"
            : state === "detected"
              ? "border-ai/40 bg-ai-soft/70 text-ai-ink hover:border-ai/70"
              : "border-line-2 bg-card text-ink-3 hover:border-line-3 hover:text-ink",
        )}
      >
        <TypeIcon type={type} className="h-3 w-3" />
        {label}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <span className="truncate text-[12px] text-ink-3" title={hint}>
        {hint}
      </span>
    </div>
  );
}

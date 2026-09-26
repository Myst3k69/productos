"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ChevronDown, X } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { useBuildOS } from "@/lib/buildos/store";
import { initialTasksFromBrief } from "@/lib/buildos/generate";
import type { FounderProfile, ProjectBrief } from "@/lib/buildos/types";
import { TASK_TYPE_META, type Project } from "@/lib/domain/types";
import { Wordmark } from "@/components/shell/Brand";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { cn, modKey } from "@/lib/client/utils";
import { ProjectPreview } from "./ProjectPreview";
import { StepWelcome } from "./StepWelcome";
import { IDEA_MIN, StepIdea } from "./StepIdea";
import { StepChat, chatComplete } from "./StepChat";
import { StepBrief } from "./StepBrief";
import { StepGenerate } from "./StepGenerate";
import { StepAgents } from "./StepAgents";
import { StepClub } from "./StepClub";
import { StepFinal } from "./StepFinal";
import {
  APP_EMOJI,
  STEPS,
  TEMPLATE_IDEAS,
  briefToText,
  buildBrief,
  dueDateFor,
  emptyDraft,
  isAppType,
  readDraft,
  signature,
  slugify,
  writeDraft,
  type DraftPatch,
  type OnboardingDraft,
  type StepId,
} from "./draft";

const ALL_STEPS = STEPS.map((s) => s.id);
const LOCKED_BEFORE: StepId = "club";

function initDraft(params: URLSearchParams, profile: FounderProfile | null, projects: Project[]): OnboardingDraft {
  const returning = !!profile?.onboarded;
  const ideaParam = params.get("idea")?.trim().slice(0, 1500) ?? "";
  const tpl = params.get("template");
  const stored = readDraft();
  let d: OnboardingDraft;

  if (ideaParam || isAppType(tpl)) {
    // Arrivée depuis la landing : nouvelle idée, on garde le profil déjà saisi.
    const base = emptyDraft();
    d = stored
      ? { ...base, name: stored.name, role: stored.role, techLevel: stored.techLevel, stage: stored.stage, hoursPerWeek: stored.hoursPerWeek }
      : base;
    d.idea = ideaParam || (isAppType(tpl) ? TEMPLATE_IDEAS[tpl] : "");
    d.step = returning ? "idea" : "welcome";
  } else if (stored) {
    d = stored;
    // Projet supprimé entre-temps : on repart d'un brouillon propre.
    if (d.projectId && !projects.some((p) => p.id === d.projectId)) d = { ...emptyDraft(), name: d.name, role: d.role, techLevel: d.techLevel, stage: d.stage, hoursPerWeek: d.hoursPerWeek };
  } else {
    d = emptyDraft();
  }

  // Nom saisi à l'inscription (compte) : inutile de le redemander.
  if (!d.name && profile?.name) d = { ...d, name: profile.name };
  if (returning && profile) {
    d = { ...d, name: d.name || profile.name, role: profile.role, techLevel: profile.techLevel, stage: d.stage, hoursPerWeek: profile.hoursPerWeek };
    if (d.step === "welcome") d.step = "idea";
  }
  return d;
}

function toProjectBrief(d: OnboardingDraft, projectId = "apercu"): ProjectBrief | null {
  const b = d.brief;
  if (!b) return null;
  return {
    projectId,
    pitch: b.pitch.trim(),
    audience: b.audience.trim(),
    problem: b.problem.trim(),
    features: b.features.map((f) => f.trim()).filter(Boolean),
    constraints: b.constraints.trim(),
    appType: b.appType,
    createdAt: new Date().toISOString(),
  };
}

export function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useBuildOS((s) => s.profile);
  const hasProjects = useStore((s) => s.projects.length > 0);
  const reduce = useReducedMotion();
  const [returning] = React.useState(() => !!profile?.onboarded);
  const [draft, setDraft] = React.useState<OnboardingDraft>(() => initDraft(new URLSearchParams(params.toString()), profile, useStore.getState().projects));
  const [dir, setDir] = React.useState(1);
  const [genCount, setGenCount] = React.useState(0);
  const [creating, setCreating] = React.useState(false);
  const [entering, setEntering] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const finished = React.useRef(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stepRef = React.useRef<HTMLDivElement>(null);

  const order: StepId[] = returning ? ALL_STEPS.filter((s) => s !== "welcome") : ALL_STEPS;
  const at = order.indexOf(draft.step);
  const simple = draft.techLevel === "none";

  const update = React.useCallback((patch: DraftPatch) => setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) })), []);

  // Brouillon sauvegardé à chaque changement ; l'URL de la landing est nettoyée une fois lue.
  React.useEffect(() => {
    if (!finished.current) writeDraft(draft);
  }, [draft]);
  React.useEffect(() => {
    if (params.get("idea") || params.get("template")) router.replace("/onboarding", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectBrief = React.useMemo(() => toProjectBrief(draft), [draft]);
  const briefSig = React.useMemo(() => signature(draft.brief), [draft.brief]);

  const canContinue = (() => {
    switch (draft.step) {
      case "welcome":
        return draft.name.trim().length > 0;
      case "idea":
        return draft.idea.trim().length >= IDEA_MIN;
      case "chat":
        return chatComplete(draft.chat);
      case "brief":
        return !!draft.brief && !!draft.brief.projectName.trim() && !!draft.brief.pitch.trim() && draft.brief.features.some((f) => f.trim());
      case "generate":
        return genCount >= 10 || draft.generatedFor === briefSig;
      case "agents":
        return !creating;
      default:
        return true;
    }
  })();

  const canGoBack = at > 0 && !(draft.projectId && order.indexOf(draft.step) <= order.indexOf(LOCKED_BEFORE)) && draft.step !== "final";

  const goTo = (step: StepId) => {
    const i = order.indexOf(step);
    if (i < 0) return;
    setDir(i >= at ? 1 : -1);
    update({ step });
  };

  /* ── Création du projet (fin de l'étape « équipe ») ── */
  const createProject = async (): Promise<boolean> => {
    if (draft.projectId) return true;
    const b = draft.brief;
    const pb = toProjectBrief(draft);
    if (!b || !pb) return false;
    setCreating(true);
    try {
      const store = useStore.getState();
      const picked = draft.backlog.filter((t) => t.checked);
      const kind = picked.some((t) => TASK_TYPE_META[t.type].destination === "folder") ? "mixed" : "code";
      const name = b.projectName.trim();
      const project = await store.createProject({
        name,
        description: pb.pitch,
        emoji: APP_EMOJI[b.appType],
        kind,
        workspacePath: `~/Projets/${slugify(name)}`,
        repoPath: null,
        baseBranch: "main",
        autonomy: draft.autonomy,
        integrations: undefined,
        aiModel: null,
        aiEffort: null,
        context: briefToText(b, draft.idea),
        initGit: true,
      });
      const bos = useBuildOS.getState();
      bos.setBrief({ ...pb, projectId: project.id });
      bos.generateFoundations(project);
      bos.ensureProject(project);
      bos.setProfile(
        returning
          ? { onboarded: true }
          : { name: draft.name.trim(), role: draft.role, techLevel: draft.techLevel, stage: draft.stage, hoursPerWeek: draft.hoursPerWeek, goal: pb.pitch, onboarded: true },
      );
      update({ projectId: project.id });
      for (let i = 0; i < picked.length; i++) {
        const t = picked[i];
        await store.createTask({
          projectId: project.id,
          title: t.title,
          spec: t.spec,
          type: t.type,
          priority: t.priority,
          autonomy: null,
          dueDate: dueDateFor(i, picked.length),
          labels: ["v1"],
          startNow: i < 2,
        });
      }
      return true;
    } catch (err) {
      toast.error("La création du projet a échoué.", { description: err instanceof Error ? err.message : "Réessayez dans un instant." });
      return false;
    } finally {
      setCreating(false);
    }
  };

  const enter = () => {
    if (entering) return;
    setEntering(true);
    finished.current = true;
    useBuildOS.getState().completeOnboarding();
    if (draft.projectId) useStore.getState().setProject(draft.projectId);
    writeDraft(null);
    router.push("/home");
  };

  const next = async () => {
    if (!canContinue || creating || entering) return;
    const step = draft.step;
    if (step === "chat") {
      const src = signature({ idea: draft.idea, chat: draft.chat });
      if (!draft.brief || draft.briefSource !== src) update({ brief: buildBrief(draft), briefSource: src });
    }
    if (step === "brief" && projectBrief) {
      if (draft.generatedFor !== briefSig) setGenCount(0);
      if (draft.backlogSource !== briefSig || !draft.backlog.length) {
        update({
          backlog: initialTasksFromBrief(projectBrief).map((t, i) => ({ ...t, id: `b${i}`, checked: true })),
          backlogSource: briefSig,
        });
      }
    }
    if (step === "agents") {
      const ok = await createProject();
      if (!ok) return;
    }
    if (step === "final") {
      enter();
      return;
    }
    const n = order[at + 1];
    if (n) goTo(n);
  };
  const back = () => {
    if (!canGoBack) return;
    goTo(order[at - 1]);
  };

  const nextRef = React.useRef(next);
  nextRef.current = next;

  /* ── Clavier : Entrée pour continuer ; neutralise les raccourcis de l'app (N, 1-5, ⌘K) ── */
  React.useEffect(() => {
    const isTyping = (el: HTMLElement | null) => !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    const guard = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.stopPropagation();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(el)) return;
      if (/^[nN1-5]$/.test(e.key)) e.stopPropagation();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.altKey || e.isComposing || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "BUTTON" || tag === "A" || tag === "SELECT" || el?.getAttribute("role") === "switch") return;
      if (tag === "TEXTAREA" && !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      void nextRef.current();
    };
    window.addEventListener("keydown", guard, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", guard, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Nouvelle étape : retour en haut, focus sur le titre si rien d'autre ne l'a pris.
  const onStepShown = () => {
    const active = document.activeElement as HTMLElement | null;
    if (stepRef.current && (!active || active === document.body || !stepRef.current.contains(active))) {
      const autofocused = stepRef.current.querySelector<HTMLElement>("[autofocus], [data-autofocus]");
      if (!autofocused) stepRef.current.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    }
  };
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [draft.step]);

  const index = at + 1;
  const common = { draft, update, simple, index };

  const renderStep = () => {
    switch (draft.step) {
      case "welcome":
        return <StepWelcome {...common} />;
      case "idea":
        return <StepIdea {...common} returning={returning} />;
      case "chat":
        return <StepChat {...common} />;
      case "brief":
        return <StepBrief {...common} />;
      case "generate":
        return projectBrief ? <StepGenerate {...common} brief={projectBrief} sig={briefSig} count={genCount} setCount={setGenCount} /> : null;
      case "agents":
        return <StepAgents {...common} />;
      case "club":
        return <StepClub {...common} />;
      case "final":
        return <StepFinal {...common} onEnter={enter} entering={entering} />;
    }
  };

  const cta: { label: string; variant: "ink" | "primary" | "ai" } = (() => {
    switch (draft.step) {
      case "idea":
        return { label: "Envoyer à l'IA", variant: "ai" };
      case "chat":
        return { label: "Voir mon brief", variant: "ink" };
      case "brief":
        return { label: "C'est ça ! Générer mes fondations", variant: "primary" };
      case "generate":
        return { label: "Composer mon équipe", variant: "ink" };
      case "agents":
        return { label: creating ? "Création du projet…" : "Créer mon projet", variant: "primary" };
      default:
        return { label: "Continuer", variant: "ink" };
    }
  })();

  const joinedClub = !!profile?.joinedClub;
  const progress = (index / order.length) * 100;

  return (
    <div className="relative flex h-dvh flex-col bg-paper">
      {/* ── Barre du haut + progression ── */}
      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line-2 bg-paper px-4 sm:px-6">
        <span className="sm:hidden">
          <Wordmark compact />
        </span>
        <span className="hidden sm:inline-flex">
          <Wordmark tagline={false} />
        </span>

        <nav aria-label="Étapes de l'onboarding" className="hidden flex-1 justify-center md:flex">
          <ol className="flex items-center gap-1">
            {order.map((s, i) => {
              const meta = STEPS.find((x) => x.id === s)!;
              const done = i < at;
              const current = i === at;
              const reachable = done && !(draft.projectId && i <= order.indexOf(LOCKED_BEFORE) && s !== draft.step) && draft.step !== "final";
              return (
                <li key={s} className="flex items-center">
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => goTo(s)}
                    aria-current={current ? "step" : undefined}
                    aria-label={`Étape ${i + 1} : ${meta.label}${done ? " (terminée)" : ""}`}
                    className={cn("group flex h-8 items-center gap-2 rounded-full px-2 transition-colors", reachable && "hover:bg-paper-3", current && "bg-card shadow-card")}
                  >
                    <span className={cn("h-1.5 rounded-full transition-all duration-300", current ? "w-6 bg-accent" : done ? "w-3 bg-ink" : "w-3 bg-line-3")} aria-hidden />
                    {current ? <span className="whitespace-nowrap text-[12px] font-semibold text-ink">{meta.label}</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="num font-mono text-[11.5px] font-semibold text-ink-3" aria-label={`Étape ${index} sur ${order.length}`}>
            {String(index).padStart(2, "0")}
            <span className="text-ink-4">/{String(order.length).padStart(2, "0")}</span>
          </span>
          {hasProjects && draft.step !== "final" ? (
            <Button variant="ghost" size="icon" aria-label="Quitter l'onboarding (le brouillon est conservé)" title="Quitter (brouillon conservé)" onClick={() => router.push("/home")}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="absolute inset-x-0 -bottom-px h-[3px]" role="progressbar" aria-label="Progression" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <div className="h-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        {/* ── Colonne gauche : l'étape courante ── */}
        <div className="flex min-h-0 flex-col">
          <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {/* Résumé repliable (mobile / tablette) */}
            {draft.step !== "welcome" && draft.step !== "final" ? (
              <div className="border-b border-line-2 bg-paper-2 lg:hidden">
                <button
                  type="button"
                  aria-expanded={previewOpen}
                  aria-controls="onb-preview-mobile"
                  onClick={() => setPreviewOpen((o) => !o)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left sm:px-8"
                >
                  <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" aria-hidden />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">Votre projet</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{draft.brief?.projectName || "prend forme…"}</span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", previewOpen && "rotate-180")} aria-hidden />
                </button>
                {previewOpen ? (
                  <div id="onb-preview-mobile" className="reveal-fast mx-auto max-w-[520px] px-4 pb-5 pt-1 sm:px-8">
                    <ProjectPreview draft={draft} genCount={genCount} simple={simple} progress={progress} bare />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mx-auto w-full max-w-[700px] px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={draft.step}
                  ref={stepRef}
                  custom={dir}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -36 }}
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  onAnimationComplete={onStepShown}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── Navigation ── */}
          {draft.step !== "final" ? (
            <footer className="shrink-0 border-t border-line-2 bg-paper px-4 py-3 sm:px-8">
              <div className="mx-auto flex w-full max-w-[700px] items-center gap-2 sm:gap-3">
                {canGoBack ? (
                  <Button variant="ghost" size="md" onClick={back} className="px-2.5 sm:px-3.5">
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Retour</span>
                    <span className="sr-only sm:hidden">Retour</span>
                  </Button>
                ) : (
                  <span />
                )}
                <p className="hidden items-center gap-1.5 text-[12px] text-ink-3 md:flex">
                  {draft.step === "idea" ? (
                    <>
                      <Kbd>{modKey()}</Kbd>
                      <Kbd>Entrée</Kbd>
                    </>
                  ) : (
                    <Kbd>Entrée</Kbd>
                  )}
                  <span>pour continuer</span>
                </p>
                <div className="ml-auto flex items-center gap-2">
                  {draft.step === "club" && !joinedClub ? (
                    <Button variant="ghost" size="lg" onClick={() => void next()}>
                      Plus tard
                    </Button>
                  ) : null}
                  <Button variant={cta.variant} size="lg" onClick={() => void next()} disabled={!canContinue} loading={creating} className="font-semibold">
                    <span className="max-w-[58vw] truncate">{cta.label}</span>
                    {!creating ? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
                  </Button>
                </div>
              </div>
            </footer>
          ) : null}
        </div>

        {/* ── Colonne droite : le projet qui prend forme ── */}
        <aside aria-label="Votre projet prend forme" className="scrollbar-thin relative hidden min-h-0 overflow-y-auto border-l border-line-2 bg-paper-2 px-6 py-10 lg:block xl:px-8">
          <ProjectPreview draft={draft} genCount={genCount} simple={simple} progress={progress} />
        </aside>
      </div>
    </div>
  );
}

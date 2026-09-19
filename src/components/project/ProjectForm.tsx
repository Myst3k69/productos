"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { FolderOpen, GitBranch, Trash2 } from "lucide-react";
import type { Autonomy, GitMode, Project, ProjectKind } from "@/lib/domain/types";
import { CreateProjectSchema, GIT_MODES, GIT_MODE_META, PROJECT_KINDS, PROJECT_KIND_META, UpdateProjectSchema } from "@/lib/domain/types";
import { slugify } from "@/lib/domain/helpers";
import { useStore } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Segmented, Switch, Textarea } from "@/components/ui/input";
import { SectionTitle } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AutonomyCards } from "./AutonomyCards";
import { DEFAULT_EMOJI, EmojiPicker } from "./EmojiPicker";

/* ─────────────────────────── État du formulaire ─────────────────────────── */

interface FormState {
  emoji: string;
  name: string;
  kind: ProjectKind;
  description: string;
  workspacePath: string;
  /** L'utilisateur a modifié le chemin : on cesse de le suggérer. */
  pathTouched: boolean;
  repoPath: string;
  repoTouched: boolean;
  initGit: boolean;
  baseBranch: string;
  autonomy: Autonomy;
  gitMode: GitMode;
  autoPush: boolean;
  folderSubdir: string;
  context: string;
}

type FieldKey = "name" | "emoji" | "description" | "workspacePath" | "repoPath" | "baseBranch" | "context";
type FieldErrors = Partial<Record<FieldKey, string>>;
const FIELD_KEYS: readonly FieldKey[] = ["name", "emoji", "description", "workspacePath", "repoPath", "baseBranch", "context"];

const PATH_ROOT = "~/Projets";
function suggestPath(name: string): string {
  return name.trim() ? `${PATH_ROOT}/${slugify(name)}` : `${PATH_ROOT}/`;
}

function initialState(project: Project | null): FormState {
  if (!project) {
    return {
      emoji: DEFAULT_EMOJI,
      name: "",
      kind: "mixed",
      description: "",
      workspacePath: suggestPath(""),
      pathTouched: false,
      repoPath: "",
      repoTouched: false,
      initGit: true,
      baseBranch: "main",
      autonomy: "autopilot",
      gitMode: "merge",
      autoPush: false,
      folderSubdir: "livrables",
      context: "",
    };
  }
  return {
    emoji: project.emoji,
    name: project.name,
    kind: project.kind,
    description: project.description ?? "",
    workspacePath: project.workspacePath,
    pathTouched: true,
    repoPath: project.repoPath ?? project.workspacePath,
    repoTouched: !!project.repoPath && project.repoPath !== project.workspacePath,
    initGit: true,
    baseBranch: project.baseBranch,
    autonomy: project.autonomy,
    gitMode: project.integrations.git.mode,
    autoPush: project.integrations.git.autoPush,
    folderSubdir: project.integrations.folder.subdir,
    context: project.context ?? "",
  };
}

function frenchMessage(issue: z.ZodIssue): string {
  switch (issue.code) {
    case "too_small":
      return "Ce champ est requis.";
    case "too_big":
      return `Trop long : ${String(issue.maximum)} caractères maximum.`;
    default:
      return "Valeur invalide.";
  }
}

function mapIssues(issues: z.ZodIssue[]): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key !== "string") continue;
    const field = FIELD_KEYS.find((k) => k === key);
    if (field && !out[field]) out[field] = frenchMessage(issue);
  }
  return out;
}

const CONTEXT_PROMPTS = ["Produit", "Cible", "Ton", "Stack", "Contraintes"];

/* ─────────────────────────── Formulaire ─────────────────────────── */

export function ProjectForm({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const createProject = useStore((s) => s.createProject);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);

  const [form, setForm] = useState<FormState>(() => initialState(project));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const pathRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const set = (patch: Partial<FormState>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      if (patch.name !== undefined && !next.pathTouched) next.workspacePath = suggestPath(patch.name);
      if (!next.repoTouched) next.repoPath = next.workspacePath;
      return next;
    });
    const touched = Object.keys(patch).filter((k): k is FieldKey => FIELD_KEYS.includes(k as FieldKey));
    if (touched.length) {
      setErrors((e) => {
        const copy = { ...e };
        for (const k of touched) delete copy[k];
        return copy;
      });
    }
  };

  const isContent = form.kind === "content";
  const suggestion = suggestPath(form.name);
  const canResuggest = form.pathTouched && form.name.trim().length > 0 && form.workspacePath !== suggestion;

  const buildPayload = () => {
    const workspacePath = form.workspacePath.trim();
    const repo = form.repoPath.trim() || workspacePath;
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      emoji: form.emoji.trim() || DEFAULT_EMOJI,
      kind: form.kind,
      workspacePath,
      repoPath: isContent ? null : repo || null,
      baseBranch: form.baseBranch.trim() || "main",
      autonomy: form.autonomy,
      integrations: {
        git: { mode: form.gitMode, autoPush: form.autoPush },
        folder: { subdir: form.folderSubdir.trim() || "livrables" },
      },
      aiModel: project?.aiModel ?? null,
      aiEffort: project?.aiEffort ?? null,
      context: form.context.trim() || null,
      initGit: isContent ? false : form.initGit,
    };
  };

  const fail = (issues: z.ZodIssue[]) => {
    const mapped = mapIssues(issues);
    setErrors(mapped);
    if (mapped.name) nameRef.current?.focus();
    else if (mapped.workspacePath) pathRef.current?.focus();
    else if (mapped.context) contextRef.current?.focus();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const payload = buildPayload();
    if (project) {
      const r = UpdateProjectSchema.safeParse(payload);
      if (!r.success) return fail(r.error.issues);
      setSaving(true);
      try {
        const saved = await updateProject(project.id, r.data);
        toast.success("Projet enregistré", { description: saved.name });
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Enregistrement impossible.");
      } finally {
        setSaving(false);
      }
      return;
    }
    const r = CreateProjectSchema.safeParse(payload);
    if (!r.success) return fail(r.error.issues);
    setSaving(true);
    try {
      const created = await createProject(r.data);
      toast.success(`Projet « ${created.name} » créé`, { description: "Il est sélectionné. Ajoutez une première tâche avec N." });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      toast("Projet supprimé", { description: project.name });
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeleting(false);
    }
  };

  const appendPrompt = (label: string) => {
    const line = `${label} : `;
    if (form.context.includes(`${label} :`)) {
      contextRef.current?.focus();
      return;
    }
    const sep = form.context.trim().length ? "\n" : "";
    set({ context: `${form.context.replace(/\s+$/, "")}${sep}${line}` });
    requestAnimationFrame(() => {
      const el = contextRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const invalid = (k: FieldKey) => (errors[k] ? "border-danger focus:border-danger focus:ring-danger/25" : undefined);

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogHeader>
        <DialogTitle className="font-display text-[19px] font-bold leading-tight tracking-[-0.02em] text-ink">{project ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-ink-3">Un espace de travail, un niveau d'autonomie, une façon d'intégrer ce que l'IA fabrique.</DialogDescription>
      </DialogHeader>

      <DialogBody className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col gap-7">
          {/* Identité */}
          <section className="flex flex-col gap-4">
            <Field label="Nom du projet" htmlFor="p-name" error={errors.name} hint="Court et reconnaissable : c'est ce que vous verrez dans la barre latérale.">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-md border border-line-2 bg-paper-2 text-[20px] leading-none" aria-hidden>
                  {form.emoji || DEFAULT_EMOJI}
                </span>
                <Input
                  id="p-name"
                  ref={nameRef}
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Nomad Desk"
                  maxLength={80}
                  aria-invalid={!!errors.name}
                  className={cn("font-medium", invalid("name"))}
                />
              </div>
            </Field>
            <EmojiPicker value={form.emoji} onChange={(v) => set({ emoji: v })} error={errors.emoji} />
            <Field label="Nature du projet" hint={PROJECT_KIND_META[form.kind].hint}>
              <Segmented<ProjectKind>
                value={form.kind}
                onChange={(v) => set({ kind: v })}
                options={PROJECT_KINDS.map((k) => ({ value: k, label: PROJECT_KIND_META[k].label, title: PROJECT_KIND_META[k].hint }))}
              />
            </Field>
            <Field label="Description" htmlFor="p-desc" error={errors.description} hint="Une ou deux phrases : ce que fait le produit, pour qui.">
              <Textarea
                id="p-desc"
                rows={2}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Réservation de bureaux à la journée dans des cafés et hôtels partenaires."
                maxLength={2000}
                className={cn("min-h-[64px]", invalid("description"))}
              />
            </Field>
          </section>

          {/* Espace de travail */}
          <section className="flex flex-col gap-4">
            <SectionTitle>Espace de travail</SectionTitle>
            <Field
              label="Dossier de travail"
              htmlFor="p-path"
              error={errors.workspacePath}
              hint={form.pathTouched ? "Chemin local où l'IA travaille et dépose les livrables." : "Suggéré à partir du nom. Modifiez-le librement."}
            >
              <div className="relative">
                <FolderOpen className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
                <Input
                  id="p-path"
                  ref={pathRef}
                  value={form.workspacePath}
                  onChange={(e) => set({ workspacePath: e.target.value, pathTouched: true })}
                  placeholder="~/Projets/mon-projet"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={!!errors.workspacePath}
                  className={cn("pl-9 pr-24 font-mono text-[12.5px]", invalid("workspacePath"))}
                />
                {canResuggest ? (
                  <button
                    type="button"
                    onClick={() => set({ workspacePath: suggestion, pathTouched: false })}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm px-2 py-1 text-[11.5px] font-medium text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
                  >
                    Suggérer
                  </button>
                ) : null}
              </div>
            </Field>

            {!isContent ? (
              <div className="reveal-fast flex flex-col gap-4 rounded-lg border border-line bg-paper-2/60 p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <GitBranch className="h-3.5 w-3.5 text-ink-3" aria-hidden />
                  Dépôt git
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                  <Field label="Chemin du dépôt" htmlFor="p-repo" error={errors.repoPath} hint="Par défaut, le dossier de travail lui-même.">
                    <Input
                      id="p-repo"
                      value={form.repoPath}
                      onChange={(e) => set({ repoPath: e.target.value, repoTouched: true })}
                      placeholder={form.workspacePath}
                      spellCheck={false}
                      autoComplete="off"
                      className={cn("font-mono text-[12.5px]", invalid("repoPath"))}
                    />
                  </Field>
                  <Field label="Branche de base" htmlFor="p-branch" error={errors.baseBranch}>
                    <Input
                      id="p-branch"
                      value={form.baseBranch}
                      onChange={(e) => set({ baseBranch: e.target.value })}
                      placeholder="main"
                      spellCheck={false}
                      autoComplete="off"
                      className={cn("font-mono text-[12.5px]", invalid("baseBranch"))}
                    />
                  </Field>
                </div>
                <SwitchRow
                  label="Initialiser un dépôt s'il n'en existe pas"
                  hint="Un premier commit est créé si le dossier n'est pas encore versionné."
                  checked={form.initGit}
                  onCheckedChange={(v) => set({ initGit: v })}
                />
              </div>
            ) : null}
          </section>

          {/* Autonomie */}
          <section className="flex flex-col gap-3">
            <SectionTitle right={<span className="text-[11.5px] text-ink-3">Modifiable tâche par tâche</span>}>Autonomie</SectionTitle>
            <AutonomyCards value={form.autonomy} onChange={(v) => set({ autonomy: v })} />
          </section>

          {/* Intégration */}
          <section className="flex flex-col gap-4">
            <SectionTitle>Intégration</SectionTitle>
            {!isContent ? (
              <>
                <Field label="Intégration du code" hint={GIT_MODE_META[form.gitMode].hint}>
                  <Segmented<GitMode>
                    value={form.gitMode}
                    onChange={(v) => set({ gitMode: v })}
                    options={GIT_MODES.map((m) => ({ value: m, label: GIT_MODE_META[m].label, title: GIT_MODE_META[m].hint }))}
                  />
                </Field>
                <SwitchRow
                  label="Pousser automatiquement"
                  hint="Pousse la branche vers le dépôt distant à chaque intégration."
                  checked={form.autoPush}
                  onCheckedChange={(v) => set({ autoPush: v })}
                />
              </>
            ) : null}
            <Field label="Dossier de livrables" htmlFor="p-subdir" hint="Sous-dossier de l'espace de travail où l'IA dépose documents, recherches et contenus.">
              <Input
                id="p-subdir"
                value={form.folderSubdir}
                onChange={(e) => set({ folderSubdir: e.target.value })}
                placeholder="livrables"
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-[12.5px] sm:w-[260px]"
              />
            </Field>
          </section>

          {/* Contexte */}
          <section className="flex flex-col gap-3">
            <SectionTitle right={<span className="num font-mono text-[11px] text-ink-4">{form.context.length.toLocaleString("fr-FR")} / 20 000</span>}>Contexte pour l'IA</SectionTitle>
            <Field htmlFor="p-context" error={errors.context} hint="Injecté dans chaque tâche. Plus il est précis, moins l'IA pose de questions et plus le ton est juste.">
              <Textarea
                id="p-context"
                ref={contextRef}
                rows={4}
                value={form.context}
                onChange={(e) => set({ context: e.target.value })}
                placeholder={"Produit : ce que vous construisez, en une phrase.\nCible : pour qui.\nTon : direct, chaleureux, sans jargon…\nStack : Next.js, Tailwind, Supabase…"}
                className={cn("min-h-[112px] text-[13px]", invalid("context"))}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11.5px] text-ink-4">Ajouter :</span>
              {CONTEXT_PROMPTS.map((p) => {
                const present = form.context.includes(`${p} :`);
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={present}
                    onClick={() => appendPrompt(p)}
                    className={cn(
                      "inline-flex h-6 items-center rounded-full border px-2 text-[11.5px] font-medium transition-colors",
                      present ? "border-transparent bg-paper-3 text-ink-4" : "border-line-2 bg-card text-ink-2 hover:border-line-3 hover:text-ink",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </DialogBody>

      <DialogFooter className="justify-between">
        <div className="min-w-0">
          {project ? (
            <Button type="button" variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer le projet
            </Button>
          ) : (
            <span className="hidden text-[12px] text-ink-3 sm:inline">Tout reste modifiable plus tard.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {project ? "Enregistrer" : "Créer le projet"}
          </Button>
        </div>
      </DialogFooter>

      {project ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Supprimer « ${project.name} » ?`}
          description="Le projet et toutes ses tâches, journaux et artefacts seront supprimés du prototype. Cette action est irréversible."
          confirmLabel="Supprimer le projet"
          loading={deleting}
          onConfirm={onDelete}
        />
      ) : null}
    </form>
  );
}

function SwitchRow({ label, hint, checked, onCheckedChange }: { label: string; hint?: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button type="button" onClick={() => onCheckedChange(!checked)} className="min-w-0 flex-1 text-left">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12px] text-ink-3">{hint}</span> : null}
      </button>
      <Switch checked={checked} onCheckedChange={onCheckedChange} label={label} />
    </div>
  );
}

"use client";

import * as React from "react";
import { FileCode, FileDiff, FileText, Folder, GitPullRequest, Info, Link as LinkIcon, Package, Table } from "lucide-react";
import type { Artifact, FileChange, Task } from "@/lib/domain/types";
import { STAGE_ORDER } from "@/lib/domain/stages";
import { useStore, useTaskArtifacts } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Chip } from "@/components/ui/chip";
import { EmptyState, SectionTitle, Skeleton, WorkingDots } from "@/components/ui/misc";
import { ArtifactViewer } from "./ArtifactViewer";
import { viewerKind } from "./drawer-utils";

const ACTION_META: Record<FileChange["action"], { label: string; tone: "ok" | "warn" | "danger" | "neutral" }> = {
  created: { label: "créé", tone: "ok" },
  modified: { label: "modifié", tone: "warn" },
  deleted: { label: "supprimé", tone: "danger" },
  renamed: { label: "renommé", tone: "neutral" },
};

function artifactIcon(a: Artifact) {
  switch (viewerKind(a)) {
    case "diff":
      return FileDiff;
    case "markdown":
      return FileText;
    case "csv":
      return Table;
    case "link":
      return a.kind === "pr" ? GitPullRequest : a.kind === "folder" ? Folder : LinkIcon;
    default:
      return FileCode;
  }
}

function pickDefault(list: Artifact[], primaryFile: string | undefined): Artifact | null {
  if (!list.length) return null;
  if (primaryFile) {
    const hit = list.find((a) => a.title === primaryFile || a.path === primaryFile);
    if (hit) return hit;
  }
  return list.find((a) => a.kind === "diff" || a.kind === "file") ?? list[0];
}

/** Ce que l'IA a produit : résumé, fichiers touchés, livrables à consulter. */
export function ResultTab({ task }: { task: Task }) {
  const artifacts = useTaskArtifacts(task.id);
  const loaded = useStore((s) => s.detailLoaded[task.id] ?? false);
  const br = task.buildResult;
  const active = task.status === "running" || task.status === "queued";

  const viewable = React.useMemo(() => artifacts.filter((a) => a.kind !== "commit"), [artifacts]);
  const commits = React.useMemo(() => artifacts.filter((a) => a.kind === "commit"), [artifacts]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = viewable.find((a) => a.id === selectedId) ?? pickDefault(viewable, br?.primaryFile);

  if (!loaded && !br && artifacts.length === 0) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (!br && viewable.length === 0) {
    const before = STAGE_ORDER[task.stage] < STAGE_ORDER.build;
    return (
      <EmptyState
        icon={<Package />}
        title="L'IA n'a rien produit pour l'instant"
        description={
          active ? (
            <span className="inline-flex items-center gap-2">
              <WorkingDots />
              {task.stage === "build" ? "La fabrication est en cours…" : "L'IA avance, le livrable arrive après la fabrication."}
            </span>
          ) : before ? (
            "Le résultat et les livrables apparaîtront ici après la fabrication."
          ) : (
            "Aucun livrable n'a été enregistré pour cette tâche."
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {br ? (
        <section aria-labelledby="drawer-result-summary">
          <SectionTitle
            right={
              task.iteration > 0 ? (
                <Chip tone="outline" size="xs" title="Nombre de reprises après retours">
                  itération {task.iteration}
                </Chip>
              ) : null
            }
          >
            <span id="drawer-result-summary">Résumé</span>
          </SectionTitle>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink">{br.summary}</p>

          {br.notes.length ? (
            <ul className="mt-4 flex flex-col gap-1.5">
              {br.notes.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-ink-2">
                  <Info className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-4" aria-hidden />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {br?.changes.length ? (
        <section aria-labelledby="drawer-result-changes">
          <SectionTitle
            right={
              <span className="font-mono text-[11px] text-ink-3">
                {br.changes.length} fichier{br.changes.length > 1 ? "s" : ""}
              </span>
            }
          >
            <span id="drawer-result-changes">Fichiers</span>
          </SectionTitle>
          <ul className="mt-2.5 overflow-hidden rounded-md border border-line bg-card">
            {br.changes.map((c, i) => {
              const meta = ACTION_META[c.action];
              return (
                <li key={`${c.path}-${i}`} className={cn("flex items-center gap-3 px-3 py-2", i > 0 && "border-t border-line")}>
                  <Chip tone={meta.tone} size="xs" className="w-[68px] justify-center">
                    {meta.label}
                  </Chip>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[12px] text-ink" title={c.path}>
                      {c.path}
                    </span>
                    {c.summary ? <span className="block truncate text-[11.5px] text-ink-3">{c.summary}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {commits.length ? (
        <div className="flex flex-col gap-2">
          {commits.map((c) => (
            <ArtifactViewer key={c.id} artifact={c} taskId={task.id} />
          ))}
        </div>
      ) : null}

      {viewable.length ? (
        <section aria-labelledby="drawer-result-artifacts">
          <SectionTitle
            right={
              <span className="font-mono text-[11px] text-ink-3">
                {viewable.length} livrable{viewable.length > 1 ? "s" : ""}
              </span>
            }
          >
            <span id="drawer-result-artifacts">Livrables</span>
          </SectionTitle>

          {viewable.length > 1 ? (
            <div role="tablist" aria-label="Livrables" className="scrollbar-none mt-2.5 flex gap-1 overflow-x-auto rounded-lg border border-line-2 bg-paper-2 p-0.5">
              {viewable.map((a) => {
                const Icon = artifactIcon(a);
                const isActive = a.id === selected?.id;
                return (
                  <button
                    key={a.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedId(a.id)}
                    title={a.title}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] font-medium transition-all",
                      isActive ? "bg-card text-ink shadow-card" : "text-ink-3 hover:text-ink",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    <span className={cn("max-w-[200px] truncate", a.kind === "file" && "font-mono text-[12px]")}>{a.title}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {selected ? (
            <div key={selected.id} className="reveal-fast mt-3">
              {viewable.length === 1 ? (
                <p className="mb-2 flex items-center gap-1.5 text-[12px] text-ink-3">
                  {React.createElement(artifactIcon(selected), { className: "h-3.5 w-3.5", "aria-hidden": true })}
                  <span className={cn("truncate", selected.kind === "file" && "font-mono")}>{selected.title}</span>
                </p>
              ) : null}
              <ArtifactViewer artifact={selected} taskId={task.id} />
            </div>
          ) : null}
        </section>
      ) : active ? (
        <div className="flex items-center gap-3 rounded-lg border border-ai/25 bg-ai-soft/20 p-4 text-[13px] text-ai-ink">
          <WorkingDots />
          Les livrables arrivent…
        </div>
      ) : null}
    </div>
  );
}

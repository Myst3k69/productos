"use client";

import * as React from "react";
import { Copy, ExternalLink, Folder, GitCommit, GitPullRequest, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import type { Artifact } from "@/lib/domain/types";
import { useStore } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { buttonVariants, Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { formatBytes, viewerKind } from "./drawer-utils";
import { DiffViewer } from "./DiffViewer";
import { MarkdownView } from "./MarkdownView";
import { HtmlPreview } from "./HtmlPreview";
import { CsvTable } from "./CsvTable";
import { CodeView } from "./CodeView";

/** Affiche un artefact avec le visualiseur adapté ; charge le contenu à la demande. */
export function ArtifactViewer({ artifact, taskId, className }: { artifact: Artifact; taskId: string; className?: string }) {
  const kind = viewerKind(artifact);
  const needsContent = kind !== "link" && kind !== "commit";
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!needsContent || artifact.content != null) return;
    let alive = true;
    setLoading(true);
    setFailed(false);
    useStore
      .getState()
      .loadArtifact(taskId, artifact.id)
      .then((a) => {
        if (alive && a?.content == null) setFailed(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [artifact.id, artifact.content, needsContent, taskId]);

  if (kind === "link") return <LinkCard artifact={artifact} className={className} />;
  if (kind === "commit") return <CommitCard artifact={artifact} className={className} />;

  if (artifact.content == null) {
    if (loading || !failed) {
      return (
        <div className={cn("flex flex-col gap-2", className)} aria-busy>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }
    return <p className={cn("rounded-md border border-dashed border-line-2 p-4 text-[13px] text-ink-3", className)}>Le contenu de cet artefact n'est pas disponible.</p>;
  }

  const content = artifact.content;
  switch (kind) {
    case "diff":
      return <DiffViewer content={content} className={className} />;
    case "markdown":
      return <MarkdownView content={content} className={cn("rounded-md border border-line bg-card px-5 py-4", className)} />;
    case "html":
      return <HtmlPreview content={content} title={artifact.title} className={className} />;
    case "csv":
      return <CsvTable content={content} className={className} />;
    default:
      return <CodeView content={content} className={className} />;
  }
}

const LINK_META = {
  pr: { icon: GitPullRequest, label: "Pull request", hint: "Ouverte sur GitHub, prête pour la relecture." },
  folder: { icon: Folder, label: "Dossier de livrables", hint: "Les fichiers produits sont copiés dans votre espace de travail." },
  link: { icon: LinkIcon, label: "Lien", hint: "" },
} as const;

function LinkCard({ artifact, className }: { artifact: Artifact; className?: string }) {
  const meta = LINK_META[artifact.kind === "pr" || artifact.kind === "folder" ? artifact.kind : "link"];
  const Icon = meta.icon;
  const url = artifact.url ?? artifact.path ?? "";
  return (
    <div className={cn("flex items-center gap-4 rounded-md border border-line bg-card p-4 shadow-card", className)}>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper-2 text-ink-2">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{meta.label}</p>
        <p className="truncate text-[13.5px] font-medium text-ink" title={artifact.title}>
          {artifact.title}
        </p>
        {url ? (
          <p className="truncate font-mono text-[11.5px] text-ink-3" title={url}>
            {url}
          </p>
        ) : meta.hint ? (
          <p className="text-[12px] text-ink-3">{meta.hint}</p>
        ) : null}
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer noopener" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <ExternalLink className="h-3.5 w-3.5" />
          Ouvrir
        </a>
      ) : null}
    </div>
  );
}

function CommitCard({ artifact, className }: { artifact: Artifact; className?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.title);
      toast("Identifiant du commit copié");
    } catch {
      toast.error("Impossible de copier.");
    }
  };
  return (
    <div className={cn("flex items-center gap-3 rounded-md border border-line bg-card px-4 py-3", className)}>
      <GitCommit className="h-4 w-4 shrink-0 text-ink-3" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[13px] text-ink">{artifact.title}</p>
        {artifact.path ? <p className="truncate font-mono text-[11.5px] text-ink-3">{artifact.path}</p> : null}
      </div>
      {artifact.size ? <span className="font-mono text-[11px] text-ink-4">{formatBytes(artifact.size)}</span> : null}
      <Button variant="ghost" size="icon-sm" aria-label="Copier l'identifiant du commit" onClick={copy}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

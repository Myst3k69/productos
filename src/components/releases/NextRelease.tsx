"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, PackagePlus, PackageCheck } from "lucide-react";
import type { Release } from "@/lib/buildos/types";
import type { Task } from "@/lib/domain/types";
import { useBuildOS } from "@/lib/buildos/store";
import { cn, plural, timeAgoCompact } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { TypeIcon } from "@/components/shared/task-bits";

/** « Prochaine release » : tâches terminées pas encore livrées → préparer une release. */
export function NextRelease({ projectId, tasks, releases }: { projectId: string; tasks: Task[]; releases: Release[] }) {
  const shipped = React.useMemo(() => new Set(releases.flatMap((r) => r.items.map((i) => i.trim().toLowerCase()))), [releases]);
  const pending = React.useMemo(
    () => tasks.filter((t) => t.stage === "done" && t.status !== "cancelled" && !shipped.has(t.title.trim().toLowerCase())).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [tasks, shipped],
  );
  const [excluded, setExcluded] = React.useState<Set<string>>(new Set());
  const [title, setTitle] = React.useState("");
  const picked = pending.filter((t) => !excluded.has(t.id));
  const suggested = picked.length ? (picked.length === 1 ? picked[0].title : `${picked[0].title} et ${picked.length - 1} ${plural(picked.length - 1, "autre amélioration", "autres améliorations")}`) : "";
  const inFlight = releases.filter((r) => r.env === "dev" || r.env === "review").length;

  function prepare() {
    if (!picked.length) return;
    const rel = useBuildOS.getState().createRelease(projectId, { title: title.trim() || suggested, items: picked.map((t) => t.title) });
    toast.success(`${rel.version} en préparation`, { description: "L'agent assemble la release, puis elle vous attendra en revue humaine." });
    setTitle("");
    setExcluded(new Set());
  }

  if (!pending.length) {
    return (
      <EmptyState
        className="py-8"
        icon={<PackageCheck />}
        title="Tout ce qui est terminé est déjà embarqué"
        description={
          <>
            Dès qu&apos;une tâche passe « Terminé » sur le{" "}
            <Link href="/board" className="font-medium text-ink underline underline-offset-2">
              tableau
            </Link>
            , elle apparaît ici, prête à partir dans la prochaine release.
          </>
        }
      />
    );
  }

  return (
    <div>
      <ul className="flex flex-col gap-1.5" aria-label="Tâches terminées non livrées">
        {pending.map((t) => {
          const on = !excluded.has(t.id);
          return (
            <li key={t.id}>
              <label className={cn("flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors", on ? "border-line-2 bg-card" : "border-line bg-transparent opacity-60")}>
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[var(--ink)]"
                  checked={on}
                  onChange={(e) =>
                    setExcluded((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.delete(t.id);
                      else n.add(t.id);
                      return n;
                    })
                  }
                />
                <TypeIcon type={t.type} className="text-ink-3" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink" title={t.title}>
                  {t.title}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-ink-3">{t.completedAt ? timeAgoCompact(t.completedAt) : ""}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={suggested || "Titre de la release"} aria-label="Titre de la release" className="sm:flex-1" />
        <Button variant="ink" onClick={prepare} disabled={!picked.length} className="shrink-0">
          <PackagePlus className="h-4 w-4" />
          Préparer la release
          <span className="font-mono text-[11px] text-paper/70">{picked.length}</span>
        </Button>
      </div>
      {inFlight ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-ink-3">
          <ArrowRight className="h-3 w-3" aria-hidden />
          {inFlight} {plural(inFlight, "release")} déjà en développement ou en revue.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { STAGE_META, type Stage } from "@/lib/domain/stages";
import { STATUS_META, type TaskStatus } from "@/lib/domain/types";
import { cn, timeAgo } from "@/lib/client/utils";
import { ROLE_LABEL } from "@/lib/client/supabase/session";
import type { AdminProjectRow, MemberRole } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dialog, DialogHeader, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/input";
import { AdminHeader } from "./AdminShell";
import { AdminCard, AdminPage, ErrorNote, LoadingRows, ReloadButton, SearchBox, Td, Th } from "./AdminBits";
import { adminAction, useAdminData, usd } from "./admin-data";

type Filter = "all" | "running" | "waiting" | "failed";

export function ProjectsView() {
  const projects = useAdminData<AdminProjectRow[]>((sb) => sb.rpc("admin_list_projects"));
  const params = useSearchParams();
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [openId, setOpenId] = React.useState<string | null>(params.get("open"));

  const list = (projects.data ?? []).filter((p) => {
    if (filter === "running" && !p.tasks_running) return false;
    if (filter === "waiting" && !p.tasks_waiting) return false;
    if (filter === "failed" && !p.tasks_failed) return false;
    const s = q.trim().toLowerCase();
    return !s || `${p.name} ${p.owner_name ?? ""} ${p.owner_email ?? ""}`.toLowerCase().includes(s);
  });
  const open = projects.data?.find((p) => p.id === openId) ?? null;

  return (
    <>
      <AdminHeader
        badge="03"
        title="Projets"
        subtitle="Tous les projets de la plateforme, leur équipe et l'état de leurs tâches. Annulez une tâche bloquée en un clic."
        right={<ReloadButton onClick={() => void projects.reload()} loading={projects.loading} />}
      />
      <AdminPage>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox value={q} onChange={setQ} placeholder="Rechercher un projet, un propriétaire…" />
          <Segmented<Filter>
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Tous" },
              { value: "running", label: "IA au travail" },
              { value: "waiting", label: "En attente" },
              { value: "failed", label: "En échec" },
            ]}
          />
        </div>
        <AdminCard title={`${list.length} projet${list.length > 1 ? "s" : ""}`}>
          {projects.error ? <ErrorNote message={projects.error} onRetry={() => void projects.reload()} /> : null}
          {!projects.data ? (
            <LoadingRows />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead className="border-b border-line">
                  <tr>
                    <Th>Projet</Th>
                    <Th>Propriétaire</Th>
                    <Th align="right">Équipe</Th>
                    <Th>Tâches</Th>
                    <Th align="right">Coût IA</Th>
                    <Th>Activité</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((p) => (
                    <tr key={p.id} className="cursor-pointer transition-colors hover:bg-paper-2" onClick={() => setOpenId(p.id)}>
                      <Td>
                        <button type="button" onClick={() => setOpenId(p.id)} className="flex items-center gap-2 text-left font-medium text-ink">
                          <span aria-hidden>{p.emoji}</span>
                          <span className="truncate">{p.name}</span>
                          {p.archived ? <Chip tone="outline" size="xs">Archivé</Chip> : null}
                        </button>
                      </Td>
                      <Td className="text-ink-2">
                        <span className="block truncate">{p.owner_name || p.owner_email}</span>
                      </Td>
                      <Td align="right" className="num font-mono">
                        {p.members}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-mono text-[12px] text-ink-3">{p.tasks_total}</span>
                          {p.tasks_running ? <Chip tone="ai" size="xs">{p.tasks_running} IA</Chip> : null}
                          {p.tasks_waiting ? <Chip tone="accent" size="xs">{p.tasks_waiting} à traiter</Chip> : null}
                          {p.tasks_failed ? <Chip tone="danger" size="xs">{p.tasks_failed} échec</Chip> : null}
                          {p.tasks_done ? <Chip tone="ok" size="xs">{p.tasks_done} livrées</Chip> : null}
                        </div>
                      </Td>
                      <Td align="right" className="num font-mono text-ink-2">
                        {usd(p.cost_total)}
                      </Td>
                      <Td className="text-ink-3">{p.last_activity ? timeAgo(p.last_activity) : "—"}</Td>
                    </tr>
                  ))}
                  {!list.length ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-ink-3">
                        Aucun projet ne correspond.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </AdminPage>
      <ProjectSheet project={open} onClose={() => setOpenId(null)} onChanged={() => void projects.reload()} />
    </>
  );
}

interface TaskLite {
  id: string;
  title: string;
  stage: string;
  status: string;
  cost_usd: number;
  updated_at: string;
  error: string | null;
  last_activity: string | null;
}

const CANCELLABLE = new Set(["running", "queued", "failed", "waiting_input", "waiting_review", "idle"]);

function ProjectSheet({ project, onClose, onChanged }: { project: AdminProjectRow | null; onClose: () => void; onChanged: () => void }) {
  const pid = project?.id ?? "";
  const tasks = useAdminData<TaskLite[]>(
    (sb) =>
      pid
        ? sb.from("tasks").select("id,title,stage,status,cost_usd,updated_at,error,last_activity").eq("project_id", pid).order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] as TaskLite[], error: null }),
    [pid],
  );
  const members = useAdminData<{ user_id: string; role: MemberRole; name: string; email: string }[]>(
    async (sb) => {
      if (!pid) return { data: [], error: null };
      const { data: rows, error } = await sb.from("project_members").select("user_id,role").eq("project_id", pid);
      if (error) return { data: null, error };
      const ids = (rows ?? []).map((r) => r.user_id);
      const { data: profs } = ids.length ? await sb.from("profiles").select("id,name,email").in("id", ids) : { data: [] };
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return { data: (rows ?? []).map((r) => ({ user_id: r.user_id, role: r.role, name: byId.get(r.user_id)?.name ?? "", email: byId.get(r.user_id)?.email ?? "" })), error: null };
    },
    [pid],
  );
  const [busy, setBusy] = React.useState<string | null>(null);

  if (!project) return null;

  const cancel = async (t: TaskLite) => {
    setBusy(t.id);
    await adminAction((sb) => sb.rpc("admin_cancel_task", { task_id: t.id, reason: "supervision" }), `« ${t.title} » annulée`, async () => {
      await tasks.reload();
      onChanged();
    });
    setBusy(null);
  };

  return (
    <Dialog open={!!project} onOpenChange={(o) => !o && onClose()}>
      <SheetContent width={640} aria-describedby={undefined}>
        <DialogHeader className="bg-card">
          <DialogTitle className="flex items-center gap-2 font-display text-[22px] font-extrabold tracking-[-0.03em]">
            <span aria-hidden>{project.emoji}</span> {project.name}
          </DialogTitle>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {project.owner_name || project.owner_email} · créé {timeAgo(project.created_at)} · {usd(project.cost_total)} d&apos;IA
          </p>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 scrollbar-thin">
          <section className="card-surface rounded-xl">
            <h3 className="border-b border-line px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Équipe</h3>
            {members.data ? (
              <ul className="divide-y divide-line">
                {members.data.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                    <span className="min-w-0 truncate">
                      <span className="font-medium text-ink">{m.name || m.email}</span> <span className="text-ink-3">{m.email}</span>
                    </span>
                    <Chip tone={m.role === "owner" ? "ink" : "neutral"} size="xs">
                      {ROLE_LABEL[m.role]}
                    </Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <LoadingRows rows={2} />
            )}
          </section>

          <section className="card-surface rounded-xl">
            <h3 className="border-b border-line px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Tâches ({tasks.data?.length ?? "…"})</h3>
            {tasks.error ? <ErrorNote message={tasks.error} /> : null}
            {tasks.data ? (
              <ul className="divide-y divide-line">
                {tasks.data.map((t) => {
                  const status = t.status as TaskStatus;
                  return (
                    <li key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{t.title}</p>
                        <p className="truncate text-[12px] text-ink-3">
                          {STAGE_META[t.stage as Stage]?.label ?? t.stage} · {t.status === "failed" ? t.error ?? "Échec" : t.last_activity ?? "—"} · {timeAgo(t.updated_at)}
                        </p>
                      </div>
                      <Chip
                        size="xs"
                        tone={status === "failed" ? "danger" : status === "running" || status === "queued" ? "ai" : status.startsWith("waiting") ? "accent" : status === "done" ? "ok" : "neutral"}
                        className="mt-0.5"
                      >
                        {STATUS_META[status]?.label ?? t.status}
                      </Chip>
                      {CANCELLABLE.has(t.status) && t.stage !== "done" ? (
                        <Button variant="ghost" size="xs" loading={busy === t.id} onClick={() => void cancel(t)} aria-label={`Annuler la tâche ${t.title}`} className={cn("mt-0.5")}>
                          <XCircle className="h-3 w-3" /> Annuler
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
                {!tasks.data.length ? <li className="px-4 py-4 text-[13px] text-ink-3">Aucune tâche.</li> : null}
              </ul>
            ) : (
              <LoadingRows rows={3} />
            )}
          </section>
        </div>
      </SheetContent>
    </Dialog>
  );
}

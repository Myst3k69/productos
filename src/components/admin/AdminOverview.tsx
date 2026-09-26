"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Hourglass } from "lucide-react";
import { timeAgo, plural } from "@/lib/client/utils";
import type { AdminProjectRow, AdminUserRow } from "@/lib/supabase/database.types";
import { Chip } from "@/components/ui/chip";
import { AdminHeader } from "./AdminShell";
import { AdminCard, AdminPage, ErrorNote, LoadingRows, ReloadButton, StatTile } from "./AdminBits";
import { CostChart } from "./CostChart";
import { useAdminData, usd } from "./admin-data";

export interface Overview {
  users_total: number;
  users_new_7d: number;
  users_active_7d: number;
  users_suspended: number;
  admins: number;
  projects_total: number;
  projects_shared: number;
  tasks_total: number;
  tasks_running: number;
  tasks_waiting: number;
  tasks_failed: number;
  tasks_done_7d: number;
  cost_month: number;
  cost_total: number;
  users_over_quota: number;
  club_events_upcoming: number;
  club_registrations: number;
  club_posts_7d: number;
  club_posts_hidden: number;
  bookings_requested: number;
}

interface AttentionTask {
  id: string;
  title: string;
  status: string;
  project_id: string;
  updated_at: string;
  error: string | null;
  last_activity: string | null;
}

/** Tâche « running » sans nouvelle depuis ce délai : probablement bloquée (onglet fermé, bail perdu). */
const STUCK_MS = 15 * 60_000;

export function AdminOverview() {
  const ov = useAdminData<Overview>((sb) => sb.rpc("admin_overview").then((r) => ({ data: r.data as unknown as Overview | null, error: r.error })));
  const cost = useAdminData((sb) => sb.rpc("admin_cost_by_day", { days: 30 }));
  const users = useAdminData<AdminUserRow[]>((sb) => sb.rpc("admin_list_users"));
  const projects = useAdminData<AdminProjectRow[]>((sb) => sb.rpc("admin_list_projects"));
  const attention = useAdminData<AttentionTask[]>((sb) =>
    sb.from("tasks").select("id,title,status,project_id,updated_at,error,last_activity").in("status", ["failed", "running", "queued"]).order("updated_at", { ascending: false }).limit(200),
  );

  const o = ov.data;
  const projectName = new Map((projects.data ?? []).map((p) => [p.id, `${p.emoji} ${p.name}`]));
  const now = Date.now();
  const issues = (attention.data ?? []).filter((t) => t.status === "failed" || now - Date.parse(t.updated_at) > STUCK_MS).slice(0, 8);
  const reloadAll = () => {
    void ov.reload();
    void cost.reload();
    void users.reload();
    void projects.reload();
    void attention.reload();
  };

  return (
    <>
      <AdminHeader badge="01" title="Vue d'ensemble" subtitle="L'état de la plateforme en un coup d'œil : comptes, projets, IA et Build Club." right={<ReloadButton onClick={reloadAll} loading={ov.loading} />} />
      <AdminPage>
        {ov.error ? <ErrorNote message={ov.error} onRetry={() => void ov.reload()} /> : null}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile index={0} label="Comptes" value={o?.users_total ?? "…"} sub={o ? `+${o.users_new_7d} cette semaine · ${o.users_active_7d} actifs (7 j)` : undefined} />
          <StatTile index={1} label="Projets" value={o?.projects_total ?? "…"} sub={o ? `${o.projects_shared} en équipe · ${o.tasks_total} tâches` : undefined} />
          <StatTile
            index={2}
            label="IA au travail"
            tone={o?.tasks_failed ? "danger" : "ai"}
            value={o ? o.tasks_running : "…"}
            sub={o ? `${o.tasks_waiting} en attente humaine · ${o.tasks_failed} ${plural(o.tasks_failed, "échec")}` : undefined}
          />
          <StatTile index={3} label="Coût IA du mois" tone="accent" value={o ? usd(o.cost_month) : "…"} sub={o ? `${o.users_over_quota} ${plural(o.users_over_quota, "compte")} au quota · ${usd(o.cost_total)} au total` : undefined} />
        </div>

        <AdminCard title="Coût IA par jour · 30 jours" index={4} right={<Link href="/admin/ai" className="text-[12px] font-semibold text-accent-ink hover:underline">Quotas →</Link>}>
          <div className="px-4 pb-3 pt-2">{cost.data ? <CostChart days={cost.data} /> : cost.error ? <ErrorNote message={cost.error} /> : <LoadingRows rows={3} />}</div>
          <p className="border-t border-line px-4 py-2 text-[11.5px] text-ink-3">Prototype : l&apos;IA est simulée, ces coûts sont des estimations générées par la simulation.</p>
        </AdminCard>

        <div className="grid gap-5 lg:grid-cols-2">
          <AdminCard title="Tâches à surveiller" index={5} right={<Chip tone={issues.length ? "danger" : "ok"} size="sm">{issues.length || "RAS"}</Chip>}>
            {attention.loading && !attention.data ? (
              <LoadingRows rows={4} />
            ) : issues.length ? (
              <ul className="divide-y divide-line">
                {issues.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                    {t.status === "failed" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Échec" /> : <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-label="Bloquée" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{t.title}</p>
                      <p className="truncate text-[12px] text-ink-3">
                        {projectName.get(t.project_id) ?? "Projet"} · {t.status === "failed" ? t.error ?? "Échec" : `sans nouvelle depuis ${timeAgo(t.updated_at).replace("il y a ", "")}`}
                      </p>
                    </div>
                    <Link href={`/admin/projects?open=${t.project_id}`} className="shrink-0 text-[12px] font-semibold text-accent-ink hover:underline">
                      Voir
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-[13px] text-ink-3">Aucune tâche en échec ni bloquée. Tout roule.</p>
            )}
          </AdminCard>

          <AdminCard title="Dernières inscriptions" index={6} right={<Link href="/admin/users" className="text-[12px] font-semibold text-accent-ink hover:underline">Tous →</Link>}>
            {users.data ? (
              <ul className="divide-y divide-line">
                {users.data.slice(0, 6).map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{u.name || u.email}</p>
                      <p className="truncate text-[12px] text-ink-3">
                        {u.email} · {timeAgo(u.created_at)}
                      </p>
                    </div>
                    {!u.email_confirmed_at ? <Chip tone="warn" size="sm">E-mail à confirmer</Chip> : u.onboarded ? <Chip tone="ok" size="sm">Onboardé</Chip> : <Chip tone="outline" size="sm">Sans projet</Chip>}
                  </li>
                ))}
              </ul>
            ) : (
              <LoadingRows rows={4} />
            )}
          </AdminCard>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile index={7} label="Événements à venir" value={o?.club_events_upcoming ?? "…"} sub={o ? `${o.club_registrations} inscriptions` : undefined} />
          <StatTile index={8} label="Posts (7 j)" value={o?.club_posts_7d ?? "…"} sub={o ? `${o.club_posts_hidden} masqués` : undefined} />
          <StatTile index={9} label="Réservations d'experts" tone={o?.bookings_requested ? "accent" : "ink"} value={o?.bookings_requested ?? "…"} sub="à confirmer" />
          <StatTile index={10} label="Comptes suspendus" tone={o?.users_suspended ? "danger" : "ink"} value={o?.users_suspended ?? "…"} sub={o ? `${o.admins} ${plural(o.admins, "admin")}` : undefined} />
        </div>

        <Link href="/admin/club" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-ink hover:underline">
          Gérer le Build Club <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </AdminPage>
    </>
  );
}

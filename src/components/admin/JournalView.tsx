"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AdminAuditLogRow } from "@/lib/supabase/database.types";
import { AdminHeader } from "./AdminShell";
import { AdminCard, AdminPage, ErrorNote, LoadingRows, ReloadButton } from "./AdminBits";
import { useAdminData } from "./admin-data";

const ACTION_LABEL: Record<string, string> = {
  "user.role": "Rôle modifié",
  "user.suspend": "Compte suspendu",
  "user.reactivate": "Compte réactivé",
  "user.quota": "Plan / quota modifié",
  "task.cancel": "Tâche annulée",
  "post.hide": "Publication masquée",
  "post.show": "Publication rétablie",
  "booking.confirmed": "Réservation confirmée",
  "booking.cancelled": "Réservation annulée",
  "booking.requested": "Réservation remise en attente",
  "club_events.insert": "Événement créé",
  "club_events.update": "Événement modifié",
  "club_events.delete": "Événement supprimé",
  "club_labs.insert": "Lab créé",
  "club_labs.update": "Lab modifié",
  "club_labs.delete": "Lab supprimé",
  "experts.insert": "Expert ajouté",
  "experts.update": "Expert modifié",
  "experts.delete": "Expert supprimé",
};

function detailText(row: AdminAuditLogRow, names: Map<string, string>): string {
  const d = (row.details ?? {}) as Record<string, unknown>;
  const target = row.target_type === "user" && row.target_id ? names.get(row.target_id) ?? "compte" : "";
  const parts: string[] = [];
  if (target) parts.push(target);
  if (typeof d.label === "string") parts.push(`« ${d.label} »`);
  if (typeof d.title === "string") parts.push(`« ${d.title} »`);
  if (d.from && d.to) parts.push(`${String(d.from)} → ${String(d.to)}`);
  if (d.quota_to !== undefined) parts.push(`quota ${String(d.quota_from)} → ${String(d.quota_to)} $, plan ${String(d.plan_to)}`);
  if (typeof d.reason === "string" && d.reason) parts.push(`motif : ${d.reason}`);
  return parts.join(" · ");
}

export function JournalView() {
  const log = useAdminData<AdminAuditLogRow[]>((sb) => sb.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(300));
  const people = useAdminData<{ id: string; name: string; email: string }[]>((sb) => sb.from("profiles").select("id,name,email"));
  const names = new Map((people.data ?? []).map((p) => [p.id, p.name || p.email]));

  return (
    <>
      <AdminHeader badge="06" title="Journal" subtitle="Chaque action d'administration est enregistrée : qui, quoi, quand. Le journal n'est pas modifiable." right={<ReloadButton onClick={() => void log.reload()} loading={log.loading} />} />
      <AdminPage>
        <AdminCard title={`${log.data?.length ?? "…"} actions (300 dernières)`}>
          {log.error ? <ErrorNote message={log.error} /> : null}
          {!log.data ? (
            <LoadingRows />
          ) : log.data.length ? (
            <ol className="divide-y divide-line">
              {log.data.map((r) => (
                <li key={r.id} className="grid gap-1 px-4 py-2.5 text-[13px] sm:grid-cols-[150px_1fr]">
                  <time dateTime={r.created_at} className="font-mono text-[12px] text-ink-3">
                    {format(new Date(r.created_at), "d MMM HH:mm", { locale: fr })}
                  </time>
                  <p className="min-w-0 text-ink-2">
                    <span className="font-semibold text-ink">{r.actor_id ? names.get(r.actor_id) ?? "Admin" : "Système"}</span> · {ACTION_LABEL[r.action] ?? r.action}
                    {detailText(r, names) ? <span className="text-ink-3"> · {detailText(r, names)}</span> : null}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-6 text-center text-[13px] text-ink-3">Aucune action pour l&apos;instant.</p>
          )}
        </AdminCard>
      </AdminPage>
    </>
  );
}

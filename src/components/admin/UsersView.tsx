"use client";

import * as React from "react";
import { Ban, Check, ShieldCheck, ShieldOff } from "lucide-react";
import { cn, initials, timeAgo } from "@/lib/client/utils";
import { PLANS, planLabel } from "@/lib/client/supabase/plans";
import type { AdminProjectRow, AdminUserRow } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/input";
import { AdminHeader } from "./AdminShell";
import { AdminCard, AdminPage, ErrorNote, LoadingRows, ReloadButton, SearchBox, Td, Th } from "./AdminBits";
import { adminAction, useAdminData, usd } from "./admin-data";

type Filter = "all" | "admins" | "suspended" | "unconfirmed" | "over_quota";

function overQuota(u: AdminUserRow) {
  return u.ai_quota_usd > 0 && u.cost_month >= u.ai_quota_usd;
}

export function UsersView() {
  const users = useAdminData<AdminUserRow[]>((sb) => sb.rpc("admin_list_users"));
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const list = (users.data ?? []).filter((u) => {
    if (filter === "admins" && u.app_role !== "admin") return false;
    if (filter === "suspended" && !u.suspended_at) return false;
    if (filter === "unconfirmed" && u.email_confirmed_at) return false;
    if (filter === "over_quota" && !overQuota(u)) return false;
    const s = q.trim().toLowerCase();
    return !s || `${u.name} ${u.email}`.toLowerCase().includes(s);
  });
  const open = users.data?.find((u) => u.id === openId) ?? null;

  return (
    <>
      <AdminHeader badge="02" title="Utilisateurs" subtitle="Comptes, rôles, suspensions et quotas IA. Chaque action est inscrite au journal." right={<ReloadButton onClick={() => void users.reload()} loading={users.loading} />} />
      <AdminPage>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox value={q} onChange={setQ} placeholder="Rechercher un nom, un e-mail…" />
          <Segmented<Filter>
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Tous" },
              { value: "admins", label: "Admins" },
              { value: "suspended", label: "Suspendus" },
              { value: "unconfirmed", label: "Non confirmés" },
              { value: "over_quota", label: "Au quota" },
            ]}
          />
        </div>
        <AdminCard title={`${list.length} compte${list.length > 1 ? "s" : ""}`}>
          {users.error ? <ErrorNote message={users.error} onRetry={() => void users.reload()} /> : null}
          {!users.data ? (
            <LoadingRows />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead className="border-b border-line">
                  <tr>
                    <Th>Compte</Th>
                    <Th>Rôle</Th>
                    <Th align="right">Projets</Th>
                    <Th align="right">IA ce mois</Th>
                    <Th>Dernière connexion</Th>
                    <Th>Inscrit</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((u) => (
                    <tr key={u.id} className="cursor-pointer transition-colors hover:bg-paper-2" onClick={() => setOpenId(u.id)}>
                      <Td>
                        <button type="button" className="flex items-center gap-2.5 text-left" onClick={() => setOpenId(u.id)}>
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-3 font-display text-[11px] font-extrabold" aria-hidden>
                            {initials(u.name || u.email)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">{u.name || "—"}</span>
                            <span className="block truncate text-[12px] text-ink-3">{u.email}</span>
                          </span>
                        </button>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {u.app_role === "admin" ? <Chip tone="ink" size="xs">Admin</Chip> : <Chip tone="neutral" size="xs">Fondateur</Chip>}
                          {u.suspended_at ? <Chip tone="danger" size="xs">Suspendu</Chip> : null}
                          {!u.email_confirmed_at ? <Chip tone="warn" size="xs">Non confirmé</Chip> : null}
                        </div>
                      </Td>
                      <Td align="right" className="num font-mono">
                        {u.projects_owned}
                        {u.projects_member ? <span className="text-ink-4"> +{u.projects_member}</span> : null}
                      </Td>
                      <Td align="right" className={cn("num font-mono", overQuota(u) ? "font-semibold text-danger" : "text-ink-2")}>
                        {usd(u.cost_month)}
                        <span className="text-ink-4"> / {u.ai_quota_usd > 0 ? usd(u.ai_quota_usd) : "∞"}</span>
                      </Td>
                      <Td className="text-ink-3">{u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "jamais"}</Td>
                      <Td className="text-ink-3">{timeAgo(u.created_at)}</Td>
                    </tr>
                  ))}
                  {!list.length ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-ink-3">
                        Aucun compte ne correspond.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </AdminPage>
      <UserSheet user={open} onClose={() => setOpenId(null)} onChanged={() => void users.reload()} />
    </>
  );
}

function UserSheet({ user, onClose, onChanged }: { user: AdminUserRow | null; onClose: () => void; onChanged: () => void }) {
  const projects = useAdminData<AdminProjectRow[]>((sb) => sb.rpc("admin_list_projects"), []);
  const [quota, setQuota] = React.useState("");
  const [plan, setPlan] = React.useState("builder");
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setQuota(String(user.ai_quota_usd));
    setPlan(user.plan);
    setReason("");
  }, [user]);

  if (!user) return null;
  const owned = (projects.data ?? []).filter((p) => p.owner_id === user.id);

  const run = async (fn: Parameters<typeof adminAction>[0], msg: string) => {
    setBusy(true);
    await adminAction(fn, msg, onChanged);
    setBusy(false);
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent width={560} aria-describedby={undefined}>
        <DialogHeader className="bg-card">
          <DialogTitle className="font-display text-[22px] font-extrabold tracking-[-0.03em]">{user.name || user.email}</DialogTitle>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {user.email} · inscrit {timeAgo(user.created_at)} · {user.last_sign_in_at ? `vu ${timeAgo(user.last_sign_in_at)}` : "jamais connecté"}
          </p>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 scrollbar-thin">
          {user.suspended_at ? (
            <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
              Suspendu {timeAgo(user.suspended_at)}
              {user.suspended_reason ? ` : ${user.suspended_reason}` : ""}. Le compte ne voit plus aucun projet et ne peut plus rien modifier.
            </div>
          ) : null}

          <section className="card-surface rounded-xl p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Rôle & accès</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.app_role === "admin" ? (
                <Button variant="secondary" size="sm" loading={busy} onClick={() => void run((sb) => sb.rpc("admin_set_role", { target: user.id, new_role: "founder" }), "Droits d'administration retirés")}>
                  <ShieldOff className="h-3.5 w-3.5" /> Retirer les droits admin
                </Button>
              ) : (
                <Button variant="secondary" size="sm" loading={busy} onClick={() => void run((sb) => sb.rpc("admin_set_role", { target: user.id, new_role: "admin" }), "Compte promu administrateur")}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Promouvoir admin
                </Button>
              )}
              {user.suspended_at ? (
                <Button variant="ok" size="sm" loading={busy} onClick={() => void run((sb) => sb.rpc("admin_set_suspended", { target: user.id, suspend: false }), "Compte réactivé")}>
                  <Check className="h-3.5 w-3.5" /> Réactiver
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setSuspendOpen(true)}>
                  <Ban className="h-3.5 w-3.5" /> Suspendre
                </Button>
              )}
            </div>
          </section>

          <section className="card-surface rounded-xl p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Plan & quota IA</h3>
            <p className="mt-2 text-[13px] text-ink-2">
              Ce mois : <strong className="font-mono">{usd(user.cost_month)}</strong> · depuis l&apos;inscription : <span className="font-mono">{usd(user.cost_total)}</span>
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Plan" htmlFor="u-plan">
                <Select id="u-plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
                  {[...new Set([...PLANS, plan])].map((p) => (
                    <option key={p} value={p}>
                      {planLabel(p)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quota mensuel ($)" htmlFor="u-quota" hint="0 = sans plafond">
                <Input id="u-quota" type="number" min={0} step={5} value={quota} onChange={(e) => setQuota(e.target.value)} className="font-mono" />
              </Field>
              <Button
                variant="ink"
                loading={busy}
                disabled={quota === "" || Number(quota) < 0}
                onClick={() => void run((sb) => sb.rpc("admin_set_quota", { target: user.id, quota: Number(quota), new_plan: plan }), "Plan et quota enregistrés")}
              >
                Enregistrer
              </Button>
            </div>
          </section>

          <section className="card-surface rounded-xl">
            <h3 className="border-b border-line px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Projets possédés ({owned.length}) · membre de {user.projects_member} autre{user.projects_member > 1 ? "s" : ""}
            </h3>
            {owned.length ? (
              <ul className="divide-y divide-line">
                {owned.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                    <span aria-hidden>{p.emoji}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="font-mono text-[12px] text-ink-3">
                      {p.tasks_total} tâches · {p.members} membre{p.members > 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-[13px] text-ink-3">{projects.loading ? "Chargement…" : "Aucun projet."}</p>
            )}
          </section>
        </div>
      </SheetContent>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <SuspendDialog
          name={user.name || user.email}
          reason={reason}
          setReason={setReason}
          busy={busy}
          onConfirm={async () => {
            await run((sb) => sb.rpc("admin_set_suspended", { target: user.id, suspend: true, reason }), "Compte suspendu");
            setSuspendOpen(false);
          }}
        />
      </Dialog>
    </Dialog>
  );
}

function SuspendDialog({ name, reason, setReason, busy, onConfirm }: { name: string; reason: string; setReason: (v: string) => void; busy: boolean; onConfirm: () => Promise<void> }) {
  return (
    <DialogContent size="sm">
      <DialogHeader>
        <DialogTitle className="text-[18px] font-extrabold tracking-[-0.03em]">Suspendre {name} ?</DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-ink-3">Le compte perd l&apos;accès à ses projets et au Build Club jusqu&apos;à réactivation. Ses données sont conservées.</DialogDescription>
      </DialogHeader>
      <DialogBody>
        <Field label="Motif (visible par la personne)" htmlFor="suspend-reason">
          <Textarea id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. : non-respect de la charte de la communauté." />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="danger" loading={busy} onClick={() => void onConfirm()}>
          Suspendre le compte
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

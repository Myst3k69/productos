"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";
import type { AdminUserRow } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input, Segmented } from "@/components/ui/input";
import { Progress } from "@/components/ui/misc";
import { AdminHeader } from "./AdminShell";
import { AdminCard, AdminPage, ErrorNote, LoadingRows, ReloadButton, StatTile, Td, Th } from "./AdminBits";
import { CostChart } from "./CostChart";
import { adminAction, useAdminData, usd } from "./admin-data";

export function AiView() {
  const [range, setRange] = React.useState<"30" | "90">("30");
  const cost = useAdminData((sb) => sb.rpc("admin_cost_by_day", { days: Number(range) }), [range]);
  const users = useAdminData<AdminUserRow[]>((sb) => sb.rpc("admin_list_users"));
  const [edit, setEdit] = React.useState<Record<string, string>>({});

  const rows = [...(users.data ?? [])].sort((a, b) => b.cost_month - a.cost_month);
  const month = rows.reduce((a, u) => a + u.cost_month, 0);
  const capped = rows.filter((u) => u.ai_quota_usd > 0);
  const over = capped.filter((u) => u.cost_month >= u.ai_quota_usd).length;
  const near = capped.filter((u) => u.cost_month >= u.ai_quota_usd * 0.8 && u.cost_month < u.ai_quota_usd).length;

  const saveQuota = async (u: AdminUserRow) => {
    const v = Number(edit[u.id]);
    if (!Number.isFinite(v) || v < 0) return;
    await adminAction((sb) => sb.rpc("admin_set_quota", { target: u.id, quota: v }), `Quota de ${u.name || u.email} : ${v ? usd(v) : "sans plafond"}`, () => {
      setEdit((e) => {
        const n = { ...e };
        delete n[u.id];
        return n;
      });
      return users.reload();
    });
  };

  return (
    <>
      <AdminHeader
        badge="04"
        title="IA & quotas"
        subtitle="Consommation par compte et par jour. Le coût est imputé au propriétaire du projet ; au-delà de son quota mensuel, l'IA ne se lance plus."
        right={
          <ReloadButton
            onClick={() => {
              void cost.reload();
              void users.reload();
            }}
            loading={cost.loading}
          />
        }
      />
      <AdminPage>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile index={0} label="Coût du mois" tone="accent" value={users.data ? usd(month) : "…"} sub="tous comptes confondus" />
          <StatTile index={1} label="Comptes au quota" tone={over ? "danger" : "ink"} value={users.data ? over : "…"} sub="IA bloquée jusqu'au 1er" />
          <StatTile index={2} label="Proches du quota" tone={near ? "accent" : "ink"} value={users.data ? near : "…"} sub="au-delà de 80 %" />
          <StatTile index={3} label="Sans plafond" value={users.data ? rows.length - capped.length : "…"} sub="quota = 0" />
        </div>

        <AdminCard title="Coût IA par jour" index={4} right={<Segmented size="sm" value={range} onChange={setRange} options={[{ value: "30", label: "30 j" }, { value: "90", label: "90 j" }]} />}>
          <div className="px-4 pb-3 pt-2">{cost.data ? <CostChart days={cost.data} /> : cost.error ? <ErrorNote message={cost.error} /> : <LoadingRows rows={3} />}</div>
        </AdminCard>

        <AdminCard title="Consommation par compte · mois en cours" index={5}>
          {users.error ? <ErrorNote message={users.error} onRetry={() => void users.reload()} /> : null}
          {!users.data ? (
            <LoadingRows />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-[13px]">
                <thead className="border-b border-line">
                  <tr>
                    <Th>Compte</Th>
                    <Th>Consommation</Th>
                    <Th align="right">Depuis l&apos;inscription</Th>
                    <Th align="right">Quota mensuel ($)</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((u) => {
                    const ratio = u.ai_quota_usd > 0 ? u.cost_month / u.ai_quota_usd : 0;
                    const dirty = edit[u.id] !== undefined && Number(edit[u.id]) !== u.ai_quota_usd;
                    return (
                      <tr key={u.id}>
                        <Td>
                          <span className="block truncate font-medium text-ink">{u.name || u.email}</span>
                          <span className="block truncate text-[12px] text-ink-3">{u.email}</span>
                        </Td>
                        <Td className="w-[34%]">
                          <div className="flex items-baseline justify-between font-mono text-[12px]">
                            <span className={cn(ratio >= 1 ? "font-semibold text-danger" : "text-ink")}>{usd(u.cost_month)}</span>
                            <span className="text-ink-4">{u.ai_quota_usd > 0 ? `${Math.round(ratio * 100)} %` : "illimité"}</span>
                          </div>
                          {u.ai_quota_usd > 0 ? <Progress value={Math.min(1, ratio)} tone={ratio >= 0.8 ? "accent" : "ai"} className="mt-1" /> : null}
                        </Td>
                        <Td align="right" className="num font-mono text-ink-3">
                          {usd(u.cost_total)}
                        </Td>
                        <Td align="right">
                          <div className="flex items-center justify-end gap-1.5">
                            <label htmlFor={`q-${u.id}`} className="sr-only">
                              Quota de {u.name || u.email}
                            </label>
                            <Input
                              id={`q-${u.id}`}
                              type="number"
                              min={0}
                              step={5}
                              value={edit[u.id] ?? String(u.ai_quota_usd)}
                              onChange={(e) => setEdit((s) => ({ ...s, [u.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && void saveQuota(u)}
                              className="h-8 w-24 text-right font-mono text-[12.5px]"
                            />
                            <Button variant={dirty ? "ink" : "ghost"} size="xs" disabled={!dirty} onClick={() => void saveQuota(u)}>
                              OK
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="border-t border-line px-4 py-2 text-[11.5px] text-ink-3">
            Prototype : l&apos;IA est simulée, les montants sont des estimations. Le contrôle du quota se fait au lancement de l&apos;IA ; avec le moteur réel, il sera appliqué côté serveur.
          </p>
        </AdminCard>
      </AdminPage>
    </>
  );
}

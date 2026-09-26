"use client";

import * as React from "react";
import { toast } from "sonner";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useBuildOS } from "@/lib/buildos/store";
import { formatCost } from "@/lib/domain/helpers";
import { cn, initials } from "@/lib/client/utils";
import { getSupabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/client/supabase/source";
import { useIsAdmin, useSession } from "@/lib/client/supabase/session";
import { planLabel } from "@/lib/client/supabase/plans";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/misc";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { authErrorMessage, passwordProblem } from "@/components/auth/auth-errors";
import { Section, SettingsCard } from "./Section";
import { SettingRow } from "./SettingRow";

/** Compte (mode Supabase) : identité, consommation IA, mot de passe, déconnexion. */
export function AccountSection({ index }: { index: number }) {
  const email = useSession((s) => s.email);
  const profile = useSession((s) => s.profile);
  const admin = useIsAdmin();
  const founderName = useBuildOS((s) => s.profile?.name ?? "");
  const [name, setName] = React.useState(founderName || profile?.name || "");
  const [usage, setUsage] = React.useState<{ cost: number; quota: number } | null>(null);
  const [pwdOpen, setPwdOpen] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => setName(founderName || profile?.name || ""), [founderName, profile?.name]);
  React.useEffect(() => {
    void getSupabase()
      .rpc("my_ai_usage")
      .then(({ data }) => {
        const row = data?.[0];
        if (row) setUsage({ cost: Number(row.month_cost_usd), quota: Number(row.quota_usd) });
      });
  }, []);

  const saveName = () => {
    const v = name.trim();
    if (!v || v === founderName) return;
    useBuildOS.getState().setProfile({ name: v });
    toast.success("Nom enregistré");
  };

  const pct = usage && usage.quota > 0 ? Math.min(100, (usage.cost / usage.quota) * 100) : 0;

  return (
    <Section index={index} title="Compte" id="compte">
      <SettingsCard>
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[16px] font-extrabold tracking-[-0.02em] text-paper" aria-hidden>
            {initials(name || email || "?")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{name || "Sans nom"}</p>
            <p className="truncate text-[12.5px] text-ink-3">{email}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <Chip tone="lime" size="sm">
              Plan {planLabel(profile?.plan)}
            </Chip>
            {admin ? (
              <Chip tone="ink" size="sm" icon={<ShieldCheck className="h-3 w-3" />}>
                Admin
              </Chip>
            ) : null}
          </div>
        </div>

        <SettingRow label="Nom affiché" hint="Visible par votre équipe et dans la communauté Build Club." htmlFor="account-name">
          <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === "Enter" && saveName()} className="w-full sm:w-64" maxLength={80} />
        </SettingRow>

        <SettingRow
          label="Consommation IA du mois"
          hint={usage && usage.quota > 0 ? "Imputée sur vos projets (dont vous êtes propriétaire). Au-delà du quota, l'IA ne se lance plus jusqu'au mois suivant." : "Aucun plafond sur votre compte."}
        >
          <div className="w-full sm:w-64">
            <div className="flex items-baseline justify-between font-mono text-[12.5px]">
              <span className={cn("font-semibold", pct >= 100 ? "text-danger" : "text-ink")}>{usage ? formatCost(usage.cost) : "…"}</span>
              <span className="text-ink-3">{usage && usage.quota > 0 ? `sur ${formatCost(usage.quota)}` : "illimité"}</span>
            </div>
            {usage && usage.quota > 0 ? <Progress value={pct / 100} tone={pct >= 90 ? "accent" : "ai"} className="mt-1.5" /> : null}
          </div>
        </SettingRow>

        <SettingRow label="Mot de passe" hint="8 caractères minimum, avec lettres et chiffres.">
          <Button variant="secondary" size="sm" onClick={() => setPwdOpen((v) => !v)} aria-expanded={pwdOpen}>
            <KeyRound className="h-3.5 w-3.5" aria-hidden />
            {pwdOpen ? "Annuler" : "Changer"}
          </Button>
        </SettingRow>
        {pwdOpen ? <PasswordForm onDone={() => setPwdOpen(false)} /> : null}

        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <p className="text-[12.5px] text-ink-3">Vos projets restent sauvegardés : reconnectez-vous depuis n&apos;importe quel appareil.</p>
          <Button
            variant="secondary"
            size="sm"
            loading={leaving}
            onClick={() => {
              setLeaving(true);
              void signOut();
            }}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Se déconnecter
          </Button>
        </div>
      </SettingsCard>
    </Section>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [pwd, setPwd] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const problem = pwd ? passwordProblem(pwd) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordProblem(pwd) || pwd !== confirm) {
      setError(passwordProblem(pwd) ?? "Les deux saisies ne correspondent pas.");
      return;
    }
    setBusy(true);
    const { error: err } = await getSupabase().auth.updateUser({ password: pwd });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    toast.success("Mot de passe modifié");
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 bg-paper-2/60 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Nouveau mot de passe" htmlFor="new-pwd" error={problem}>
        <PasswordInput id="new-pwd" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="h-9 text-[13.5px]" />
      </Field>
      <Field label="Confirmation" htmlFor="new-pwd-2" error={error && !problem ? error : null}>
        <PasswordInput id="new-pwd-2" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-9 text-[13.5px]" />
      </Field>
      <Button type="submit" variant="ink" loading={busy} disabled={!pwd || !confirm}>
        Enregistrer
      </Button>
    </form>
  );
}

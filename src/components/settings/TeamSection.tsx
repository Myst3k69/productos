"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, LogOut, MailPlus, Trash2, UserMinus, Users } from "lucide-react";
import { useCurrentProject } from "@/lib/client/store";
import { initials, timeAgo } from "@/lib/client/utils";
import { getSupabase, supabaseErrorMessage } from "@/lib/supabase/client";
import type { MemberRole, ProjectInvitationRow } from "@/lib/supabase/database.types";
import { refreshProjects } from "@/lib/client/supabase/source";
import { ROLE_LABEL, useSession } from "@/lib/client/supabase/session";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input, Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Section, SettingsCard } from "./Section";

interface Member {
  userId: string;
  role: MemberRole;
  name: string;
  email: string;
  since: string;
}

const ROLE_HINT: Record<MemberRole, string> = {
  owner: "Gère l'équipe, peut supprimer le projet.",
  member: "Crée, lance et valide les tâches.",
  viewer: "Consulte tout, ne modifie rien.",
};

/** Équipe du projet courant (mode Supabase) : membres, rôles, invitations. */
export function TeamSection({ index }: { index: number }) {
  const project = useCurrentProject();
  const userId = useSession((s) => s.userId);
  const myRole = useSession((s) => (project ? s.roles[project.id] : undefined));
  const isOwner = myRole === "owner";
  const [members, setMembers] = React.useState<Member[] | null>(null);
  const [invites, setInvites] = React.useState<ProjectInvitationRow[]>([]);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<MemberRole>("member");
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState<{ kind: "remove" | "leave"; member?: Member } | null>(null);

  const projectId = project?.id ?? null;

  const load = React.useCallback(async () => {
    if (!projectId) return;
    const sb = getSupabase();
    const { data: rows, error } = await sb.from("project_members").select("*").eq("project_id", projectId).order("created_at");
    if (error) {
      toast.error("Équipe indisponible", { description: supabaseErrorMessage(error) });
      return;
    }
    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: profiles } = ids.length ? await sb.from("profiles").select("id,name,email").in("id", ids) : { data: [] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    setMembers(
      (rows ?? []).map((r) => ({
        userId: r.user_id,
        role: r.role,
        name: byId.get(r.user_id)?.name || byId.get(r.user_id)?.email?.split("@")[0] || "Membre",
        email: byId.get(r.user_id)?.email ?? "",
        since: r.created_at,
      })),
    );
    const { data: inv } = await sb.from("project_invitations").select("*").eq("project_id", projectId).is("accepted_at", null).order("created_at", { ascending: false });
    setInvites(inv ?? []);
  }, [projectId]);

  React.useEffect(() => {
    setMembers(null);
    void load();
  }, [load]);

  if (!project) return null;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      toast.error("Adresse e-mail invalide.");
      return;
    }
    if (members?.some((m) => m.email.toLowerCase() === v)) {
      toast("Cette personne fait déjà partie de l'équipe.");
      return;
    }
    setBusy(true);
    const { error } = await getSupabase().from("project_invitations").insert({ project_id: project!.id, email: v, role, invited_by: userId });
    setBusy(false);
    if (error) {
      toast.error("Invitation impossible", { description: error.code === "23505" ? "Une invitation est déjà en attente pour cette adresse." : supabaseErrorMessage(error) });
      return;
    }
    setEmail("");
    toast.success("Invitation créée", { description: `${v} rejoindra « ${project!.name} » en se connectant avec cette adresse.` });
    void load();
  }

  async function changeRole(m: Member, next: MemberRole) {
    const { error } = await getSupabase().from("project_members").update({ role: next }).eq("project_id", project!.id).eq("user_id", m.userId);
    if (error) toast.error("Changement de rôle impossible", { description: supabaseErrorMessage(error) });
    else {
      toast.success(`${m.name} est maintenant ${ROLE_LABEL[next].toLowerCase()}`);
      void load();
    }
  }

  async function removeMember(m: Member) {
    const { error } = await getSupabase().from("project_members").delete().eq("project_id", project!.id).eq("user_id", m.userId);
    setConfirm(null);
    if (error) toast.error("Retrait impossible", { description: supabaseErrorMessage(error) });
    else {
      toast.success(`${m.name} a été retiré du projet`);
      void load();
    }
  }

  async function leave() {
    const { error } = await getSupabase().from("project_members").delete().eq("project_id", project!.id).eq("user_id", userId ?? "");
    setConfirm(null);
    if (error) {
      toast.error("Impossible de quitter le projet", { description: supabaseErrorMessage(error) });
      return;
    }
    toast.success(`Vous avez quitté « ${project!.name} »`);
    await refreshProjects();
  }

  async function revoke(inv: ProjectInvitationRow) {
    const { error } = await getSupabase().from("project_invitations").delete().eq("id", inv.id);
    if (error) toast.error("Annulation impossible", { description: supabaseErrorMessage(error) });
    else setInvites((l) => l.filter((x) => x.id !== inv.id));
  }

  const signupLink = typeof window !== "undefined" ? `${window.location.origin}/signup` : "/signup";

  return (
    <Section
      index={index}
      title="Équipe"
      id="equipe"
      right={members ? <span className="text-[11.5px] text-ink-3">{members.length} membre{members.length > 1 ? "s" : ""} · {project.name}</span> : null}
    >
      <SettingsCard>
        {!members ? (
          <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-ink-3">
            <Spinner size={14} /> Chargement de l&apos;équipe…
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {members.map((m) => {
              const me = m.userId === userId;
              return (
                <li key={m.userId} className="flex items-center gap-3 px-5 py-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-3 font-display text-[12px] font-extrabold text-ink" aria-hidden>
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">
                      {m.name} {me ? <span className="font-normal text-ink-3">(vous)</span> : null}
                    </p>
                    <p className="truncate text-[12px] text-ink-3">
                      {m.email} · depuis {timeAgo(m.since).replace("il y a ", "")}
                    </p>
                  </div>
                  {isOwner && m.role !== "owner" ? (
                    <Select aria-label={`Rôle de ${m.name}`} value={m.role} onChange={(e) => void changeRole(m, e.target.value as MemberRole)} className="h-8 w-[118px] text-[12.5px]">
                      <option value="member">{ROLE_LABEL.member}</option>
                      <option value="viewer">{ROLE_LABEL.viewer}</option>
                    </Select>
                  ) : (
                    <Chip tone={m.role === "owner" ? "ink" : m.role === "member" ? "neutral" : "outline"} size="sm" title={ROLE_HINT[m.role]}>
                      {ROLE_LABEL[m.role]}
                    </Chip>
                  )}
                  {isOwner && m.role !== "owner" ? (
                    <Button variant="ghost" size="icon-sm" aria-label={`Retirer ${m.name}`} onClick={() => setConfirm({ kind: "remove", member: m })}>
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {me && m.role !== "owner" ? (
                    <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "leave" })}>
                      <LogOut className="h-3.5 w-3.5" aria-hidden /> Quitter
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {isOwner ? (
          <div className="flex flex-col gap-3 px-5 py-4">
            <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="invite-email" className="sr-only">
                Adresse e-mail à inviter
              </label>
              <Input id="invite-email" type="email" placeholder="cofondatrice@startup.fr" value={email} onChange={(e) => setEmail(e.target.value)} className="sm:flex-1" />
              <Select aria-label="Rôle de l'invité" value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className="sm:w-[130px]">
                <option value="member">{ROLE_LABEL.member}</option>
                <option value="viewer">{ROLE_LABEL.viewer}</option>
              </Select>
              <Button type="submit" variant="ink" loading={busy} disabled={!email.trim()}>
                <MailPlus className="h-4 w-4" aria-hidden />
                Inviter
              </Button>
            </form>
            <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
              {ROLE_HINT[role]} L&apos;invitation apparaît dès que la personne se connecte avec cette adresse. Pas encore de compte ?
              <button
                type="button"
                className="inline-flex items-center gap-1 font-semibold text-accent-ink hover:underline"
                onClick={() => {
                  void navigator.clipboard?.writeText(signupLink);
                  toast.success("Lien d'inscription copié", { description: signupLink });
                }}
              >
                <Copy className="h-3 w-3" aria-hidden /> Copier le lien d&apos;inscription
              </button>
            </p>
            {invites.length ? (
              <ul className="flex flex-col gap-1.5 border-t border-dashed border-line pt-3">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-2 text-[12.5px]">
                    <Users className="h-3.5 w-3.5 shrink-0 text-ink-4" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-ink-2">
                      {inv.email} <span className="text-ink-4">· {ROLE_LABEL[inv.role]} · invitée {timeAgo(inv.created_at)}</span>
                    </span>
                    <Button variant="ghost" size="xs" onClick={() => void revoke(inv)} aria-label={`Annuler l'invitation de ${inv.email}`}>
                      <Trash2 className="h-3 w-3" /> Annuler
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="px-5 py-3 text-[12.5px] text-ink-3">Votre rôle : {myRole ? ROLE_LABEL[myRole] : "—"}. {myRole ? ROLE_HINT[myRole] : ""} Seul le propriétaire gère l&apos;équipe.</p>
        )}
      </SettingsCard>

      <ConfirmDialog
        open={confirm?.kind === "remove"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Retirer ${confirm?.member?.name ?? ""} ?`}
        description="Cette personne perd immédiatement l'accès au projet. Ses tâches restent en place."
        confirmLabel="Retirer du projet"
        onConfirm={() => (confirm?.member ? removeMember(confirm.member) : undefined)}
      />
      <ConfirmDialog
        open={confirm?.kind === "leave"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Quitter le projet ?"
        description="Vous perdez l'accès au projet. Le propriétaire pourra vous réinviter."
        confirmLabel="Quitter"
        onConfirm={leave}
      />
    </Section>
  );
}

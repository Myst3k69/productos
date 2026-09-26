"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Users, X } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { getSupabase, supabaseErrorMessage } from "@/lib/supabase/client";
import type { InvitationForMeRow } from "@/lib/supabase/database.types";
import { refreshProjects } from "@/lib/client/supabase/source";
import { ROLE_LABEL, useSession } from "@/lib/client/supabase/session";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/client/utils";

/** Invitations en attente pour le compte courant : rejoindre un projet en un clic. */
export function InvitationsBanner() {
  const cloud = useSession((s) => s.mode === "cloud");
  const [invites, setInvites] = React.useState<InvitationForMeRow[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const router = useRouter();

  const load = React.useCallback(async () => {
    const { data } = await getSupabase().rpc("my_invitations");
    setInvites(data ?? []);
  }, []);

  React.useEffect(() => {
    if (cloud) void load();
  }, [cloud, load]);

  if (!cloud || !invites.length) return null;

  async function accept(inv: InvitationForMeRow) {
    setBusy(inv.id);
    const { data, error } = await getSupabase().rpc("accept_invitation", { invitation_id: inv.id });
    if (error) {
      toast.error("Impossible de rejoindre le projet", { description: supabaseErrorMessage(error) });
      setBusy(null);
      return;
    }
    await refreshProjects();
    if (data) useStore.getState().setProject(data);
    toast.success(`Vous avez rejoint ${inv.project_name}`, { description: `Rôle : ${ROLE_LABEL[inv.role]}` });
    setBusy(null);
    await load();
    router.push("/board");
  }

  async function decline(inv: InvitationForMeRow) {
    setBusy(inv.id);
    const { error } = await getSupabase().from("project_invitations").delete().eq("id", inv.id);
    setBusy(null);
    if (error) toast.error("Refus impossible", { description: supabaseErrorMessage(error) });
    else setInvites((l) => l.filter((x) => x.id !== inv.id));
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4">
      {invites.slice(0, 3).map((inv) => (
        <div key={inv.id} role="status" className="brutal pointer-events-auto flex w-full max-w-[560px] items-center gap-3 rounded-xl bg-card px-4 py-3 reveal-fast">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-paper-2 text-[18px]" aria-hidden>
            {inv.project_emoji || <Users className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-ink">
              {inv.invited_by_name ?? "Un fondateur"} vous invite sur « {inv.project_name} »
            </p>
            <p className="text-[12px] text-ink-3">
              {ROLE_LABEL[inv.role]} · {timeAgo(inv.created_at)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void decline(inv)} disabled={busy === inv.id} aria-label={`Refuser l'invitation sur ${inv.project_name}`}>
            <X className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Refuser</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => void accept(inv)} loading={busy === inv.id}>
            <Check className="h-3.5 w-3.5" aria-hidden />
            Rejoindre
          </Button>
        </div>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useStore, useProjectTasks } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { WorkingDots } from "@/components/ui/misc";
import { useSession } from "@/lib/client/supabase/session";
import { planLabel } from "@/lib/client/supabase/plans";
import { supabaseConfigured } from "@/lib/supabase/config";
import { useFounder } from "./useFounder";

/** Carte profil (bas de la barre latérale) avec l'état de l'IA en une ligne. */
export function SidebarProfile({ collapsed }: { collapsed: boolean }) {
  const founder = useFounder();
  const plan = useSession((s) => (s.mode === "cloud" ? `Plan ${planLabel(s.profile?.plan)}` : supabaseConfigured ? "Démo locale" : "Plan Builder"));
  const ai = useStore((s) => s.ai);
  const tasks = useProjectTasks();
  const running = tasks.filter((t) => t.status === "running").length;
  const online = Boolean(ai?.available);
  const engine = ai?.engine === "mock" ? "IA de démonstration" : "Claude";
  const aiLabel = !online ? "IA hors ligne" : running ? `IA au travail · ${running} tâche${running > 1 ? "s" : ""}` : `${engine} · prête`;

  const avatar = (
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[12px] font-extrabold tracking-[-0.02em] text-paper">
      {founder.initials}
      <span
        className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card", !online ? "bg-danger" : running ? "bg-ai animate-blink" : "bg-ok")}
        aria-hidden
      />
    </span>
  );

  if (collapsed) {
    return (
      <Tooltip content={`${founder.fullName} · ${aiLabel}`} side="right">
        <Link href="/settings" aria-label={`${founder.fullName}, ${plan}. ${aiLabel}`} className="mx-auto inline-flex rounded-full">
          {avatar}
        </Link>
      </Tooltip>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-paper p-2">
      <Link href="/settings" className="flex items-center gap-2.5 rounded-md p-0.5 transition-colors hover:bg-paper-2">
        {avatar}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-ink">{founder.fullName}</span>
          <span className="block truncate text-[11px] text-ink-3">{plan}</span>
        </span>
      </Link>
      <div className="mt-2 flex items-center gap-1.5 border-t border-line px-0.5 pt-2 text-[11px]" role="status">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", !online ? "bg-danger" : running ? "bg-ai" : "bg-ok")} aria-hidden />
        <span className={cn("min-w-0 flex-1 truncate", running ? "text-ai-ink" : "text-ink-3")}>{aiLabel}</span>
        {running ? <WorkingDots /> : <span className="truncate font-mono text-[10.5px] text-ink-4">{ai?.model ?? ""}</span>}
      </div>
    </div>
  );
}

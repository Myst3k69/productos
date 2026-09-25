"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/client/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BrandMark } from "./Brand";
import { TaskDrawer } from "@/components/task/TaskDrawer";
import { NewTaskDialog } from "@/components/composer/NewTaskDialog";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { ProjectDialog } from "@/components/project/ProjectDialog";
import { useGlobalShortcuts } from "./shortcuts";

export function AppShell({ children }: { children: React.ReactNode }) {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const error = useStore((s) => s.error);
  const hasProjects = useStore((s) => s.projects.length > 0);
  const pathname = usePathname();
  const router = useRouter();
  /** Écrans plein cadre (sans barre latérale) : onboarding. */
  const isBare = pathname.startsWith("/onboarding") || pathname.startsWith("/welcome");

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!ready) return;
    if (!hasProjects && !isBare) router.replace("/onboarding");
  }, [ready, hasProjects, isBare, router]);

  useGlobalShortcuts();

  if (!ready) return <Splash />;
  if (error) return <Splash error={error} />;
  if (isBare || !hasProjects) return <TooltipProvider>{children}</TooltipProvider>;

  return (
    <TooltipProvider>
      <div className="flex h-dvh w-full overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="relative min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
      <TaskDrawer />
      <NewTaskDialog />
      <CommandPalette />
      <ProjectDialog />
    </TooltipProvider>
  );
}

function Splash({ error }: { error?: string }) {
  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4 reveal">
        <BrandMark size={40} className={error ? "" : "animate-breathe"} />
        {error ? (
          <div className="max-w-sm text-center">
            <p className="font-display text-[15px] font-semibold">Impossible de démarrer BuildOS</p>
            <p className="mt-1 text-[13px] text-ink-3">{error}</p>
          </div>
        ) : (
          <p className="text-[13px] text-ink-3">Ouverture de BuildOS…</p>
        )}
      </div>
    </div>
  );
}

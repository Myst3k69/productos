"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Wordmark, BrandMark } from "./Brand";
import { NAV_GROUPS, SETTINGS_ITEM, isActivePath } from "./nav";
import { useNavCounters } from "./useNavCounters";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarProfile } from "./SidebarProfile";

export function Sidebar() {
  const pathname = usePathname();
  const storedCollapsed = useStore((s) => s.sidebarCollapsed);
  const narrow = useNarrowScreen();
  // Sous 1024 px, la barre latérale se replie d'office pour laisser la place au contenu.
  const collapsed = storedCollapsed || narrow;
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const counters = useNavCounters();

  return (
    <aside
      className={cn(
        "relative z-20 flex h-full shrink-0 flex-col border-r border-line bg-card transition-[width] duration-200 ease-out",
        collapsed ? "w-[64px]" : "w-[236px]",
      )}
    >
      {/* Marque */}
      <div className={cn("flex h-[60px] shrink-0 items-center", collapsed ? "justify-center px-2" : "justify-between pl-4 pr-2.5")}>
        <Link href="/home" aria-label="BuildOS — vue d'ensemble" className="rounded-md">
          {collapsed ? <BrandMark /> : <Wordmark />}
        </Link>
        {!collapsed ? (
          <Tooltip content="Replier la barre" side="right">
            <button type="button" onClick={toggleSidebar} aria-label="Replier la barre latérale" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-4 transition-colors hover:bg-paper-2 hover:text-ink">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : null}
      </div>

      {/* Nouveau projet + sélecteur */}
      <div className={cn("flex shrink-0 flex-col gap-1.5 pt-2", collapsed ? "px-2" : "px-3")}>
        <Tooltip content="Nouveau projet" side="right" disabled={!collapsed}>
          <Link
            href="/onboarding"
            aria-label="Nouveau projet"
            className={cn(
              "group flex items-center gap-2 rounded-md border border-line-2 bg-card text-[13px] font-semibold text-ink transition-[border-color,box-shadow] hover:border-line-3 hover:shadow-card",
              collapsed ? "h-9 justify-center" : "h-9 px-2.5",
            )}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed ? (
              <>
                <span className="flex-1">Nouveau projet</span>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-paper-2 text-ink-3 transition-colors group-hover:bg-ink group-hover:text-paper">
                  <Plus className="h-3 w-3" aria-hidden />
                </span>
              </>
            ) : null}
          </Link>
        </Tooltip>
        <ProjectSwitcher collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav aria-label="Navigation principale" className={cn("mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-none pb-2", collapsed ? "px-2" : "px-3")}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.id} className={cn(gi > 0 && (collapsed ? "mt-2 border-t border-line pt-2" : "mt-3"))} role="group" aria-label={group.label ?? "Accueil"}>
            {group.label && !collapsed ? <p className="mb-1 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-4">{group.label}</p> : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <SidebarNavItem item={item} active={isActivePath(pathname, item.href)} collapsed={collapsed} counter={item.counter ? counters[item.counter] : undefined} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Réglages + profil */}
      <div className={cn("flex shrink-0 flex-col gap-2 border-t border-line pb-3 pt-2", collapsed ? "px-2" : "px-3")}>
        <SidebarNavItem item={SETTINGS_ITEM} active={isActivePath(pathname, SETTINGS_ITEM.href)} collapsed={collapsed} />
        <SidebarProfile collapsed={collapsed} />
        {collapsed ? (
          <Tooltip content="Déplier la barre" side="right">
            <button type="button" onClick={toggleSidebar} aria-label="Déplier la barre latérale" className="inline-flex h-8 w-full items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </aside>
  );
}

function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

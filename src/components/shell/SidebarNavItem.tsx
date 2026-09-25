"use client";

import Link from "next/link";
import { cn } from "@/lib/client/utils";
import { Tooltip } from "@/components/ui/tooltip";
import type { NavItem } from "./nav";
import type { NavCounterValue } from "./useNavCounters";

/** Entrée de navigation : active = fond orange plein, texte blanc (comme la maquette). */
export function SidebarNavItem({ item, active, collapsed, counter }: { item: NavItem; active: boolean; collapsed: boolean; counter?: NavCounterValue }) {
  const Icon = item.icon;
  const hasCount = Boolean(counter && counter.count > 0);

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? `${item.label}${hasCount && counter ? ` — ${counter.label}` : ""}` : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-[background-color,color] duration-150",
        collapsed ? "h-9 justify-center" : "h-8 px-2.5",
        active ? "bg-accent text-white shadow-[0_1px_0_rgba(0,0,0,.08),inset_0_1px_0_rgba(255,255,255,.18)]" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-ink-3 group-hover:text-ink")} aria-hidden />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {hasCount && counter ? (
            <span
              title={counter.label}
              className={cn(
                "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 font-mono text-[10.5px] font-semibold leading-none",
                active ? "bg-white/25 text-white" : counter.tone === "accent" ? "bg-accent-soft text-accent-ink" : "bg-paper-3 text-ink-2",
              )}
            >
              {counter.text ?? counter.count}
              <span className="sr-only"> — {counter.label}</span>
            </span>
          ) : item.key ? (
            <kbd className={cn("font-mono text-[10px] opacity-0 transition-opacity group-hover:opacity-100", active ? "text-white/70" : "text-ink-4")}>{item.key}</kbd>
          ) : null}
        </>
      ) : hasCount && counter ? (
        <span className={cn("absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2", active ? "bg-white ring-accent" : counter.tone === "accent" ? "bg-accent ring-card" : "bg-ink-3 ring-card")} aria-hidden />
      ) : null}
    </Link>
  );

  return collapsed ? (
    <Tooltip content={hasCount && counter ? `${item.label} · ${counter.label}` : item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bot, FolderKanban, LayoutGrid, ScrollText, Users, UsersRound } from "lucide-react";
import { cn } from "@/lib/client/utils";
import { BrandMark } from "@/components/shell/Brand";
import { TooltipProvider } from "@/components/ui/tooltip";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutGrid, exact: true },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/projects", label: "Projets", icon: FolderKanban },
  { href: "/admin/ai", label: "IA & quotas", icon: Bot },
  { href: "/admin/club", label: "Build Club", icon: UsersRound },
  { href: "/admin/journal", label: "Journal", icon: ScrollText },
];

/** Coquille de l'administration : navigation dédiée, retour vers l'application. */
export function AdminShell({ name, email, children }: { name: string; email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-col bg-paper lg:h-dvh lg:flex-row lg:overflow-hidden">
        <aside className="flex shrink-0 flex-col border-b border-line bg-ink text-paper lg:w-[232px] lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2.5 px-4 py-4">
            <BrandMark inverted />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[17px] font-extrabold tracking-[-0.04em]">BuildOS</span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lime">Administration</span>
            </span>
          </div>
          <nav aria-label="Administration" className="flex gap-1 overflow-x-auto px-3 pb-3 scrollbar-none lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {NAV.map((item) => {
              const on = active(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium transition-colors",
                    on ? "bg-paper text-ink" : "text-paper/70 hover:bg-paper/10 hover:text-paper",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden border-t border-paper/10 px-4 py-4 lg:block">
            <p className="truncate text-[13px] font-semibold">{name}</p>
            <p className="truncate text-[11.5px] text-paper/60">{email}</p>
            <Link href="/home" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-paper/80 hover:text-paper">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Retour à l&apos;application
            </Link>
          </div>
        </aside>
        <main className="min-w-0 flex-1 lg:overflow-y-auto lg:scrollbar-thin">{children}</main>
      </div>
    </TooltipProvider>
  );
}

/** En-tête d'une page d'administration. */
export function AdminHeader({ badge, title, subtitle, right }: { badge: string; title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 px-5 pb-2 pt-7 sm:flex-row sm:items-end sm:justify-between sm:px-8">
      <div className="min-w-0 reveal">
        <span className="section-badge">{badge}</span>
        <h1 className="mt-3 font-display text-[34px] font-extrabold leading-[0.95] tracking-[-0.04em] text-ink">{title}</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">{subtitle}</p>
      </div>
      {right ? <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div> : null}
    </header>
  );
}

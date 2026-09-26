"use client";

import * as React from "react";
import { RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";

/** Tuile de chiffre clé. */
export function StatTile({ label, value, sub, tone = "ink", index = 0 }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "ink" | "ai" | "accent" | "danger" | "ok"; index?: number }) {
  const color = { ink: "text-ink", ai: "text-ai-ink", accent: "text-accent-ink", danger: "text-danger", ok: "text-ok" }[tone];
  return (
    <div className="card-surface reveal rounded-xl p-4" style={{ "--i": index } as React.CSSProperties}>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">{label}</p>
      <p className={cn("num mt-2 font-display text-[30px] font-extrabold leading-none tracking-[-0.04em]", color)}>{value}</p>
      {sub ? <p className="mt-1.5 text-[12px] text-ink-3">{sub}</p> : null}
    </div>
  );
}

/** Carte titrée d'une page d'administration. */
export function AdminCard({ title, right, children, className, index = 0 }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string; index?: number }) {
  return (
    <section aria-label={title} className={cn("card-surface reveal flex min-w-0 flex-col rounded-xl", className)} style={{ "--i": index } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{title}</h2>
        {right}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" aria-hidden />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-8" />
    </div>
  );
}

export function ReloadButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={loading} aria-label="Actualiser">
      <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
      Actualiser
    </Button>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="m-4 flex items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
      <span>{message}</span>
      {onRetry ? (
        <Button variant="secondary" size="xs" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}

/** En-tête de colonne de tableau. */
export function Th({ children, className, align = "left" }: { children?: React.ReactNode; className?: string; align?: "left" | "right" }) {
  return <th className={cn("whitespace-nowrap px-3 py-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-3", align === "right" ? "text-right" : "text-left", className)}>{children}</th>;
}

export function Td({ children, className, align = "left" }: { children?: React.ReactNode; className?: string; align?: "left" | "right" }) {
  return <td className={cn("px-3 py-2.5 align-middle", align === "right" && "text-right", className)}>{children}</td>;
}

export function AdminPage({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-5 px-5 pb-16 pt-4 sm:px-8">{children}</div>;
}

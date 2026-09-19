"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-2 bg-paper-2 px-1.5 font-mono text-[11px] font-medium text-ink-3", className)}>
      {children}
    </kbd>
  );
}

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg className={cn("animate-spin text-current", className)} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Trois points qui respirent — « l'IA travaille ». */
export function WorkingDots({ className, tone = "ai" }: { className?: string; tone?: "ai" | "accent" | "ink" }) {
  const color = tone === "ai" ? "bg-ai" : tone === "accent" ? "bg-accent" : "bg-ink-3";
  return (
    <span className={cn("inline-flex items-center gap-[3px]", className)} aria-label="En cours">
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("h-[5px] w-[5px] rounded-full", color, "animate-breathe")} style={{ animationDelay: `${i * 180}ms` }} />
      ))}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md bg-paper-3", className)} />;
}

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      {icon ? <div className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-dashed border-line-3 text-ink-3 [&>svg]:h-5 [&>svg]:w-5">{icon}</div> : null}
      <h3 className="font-display text-[15px] font-semibold text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-[13px] text-ink-3 text-pretty">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, className, right }: { children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{children}</h4>
      {right}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

/** Barre de progression fine. */
export function Progress({ value, className, tone = "ai" }: { value: number; className?: string; tone?: "ai" | "accent" | "ok" }) {
  const color = tone === "ai" ? "bg-ai" : tone === "accent" ? "bg-accent" : "bg-ok";
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-paper-3", className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

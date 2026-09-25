"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/client/utils";

/** Carte de section du cockpit : pastille numérotée orange, titre gras, lien d'accès à droite. */
export function HomeSection({
  index,
  title,
  meta,
  href,
  hrefLabel,
  className,
  bodyClassName,
  style,
  children,
}: {
  index: number;
  title: string;
  meta?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  className?: string;
  bodyClassName?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const id = `home-section-${index}`;
  return (
    <section aria-labelledby={id} className={cn("reveal flex min-w-0 flex-col rounded-xl border border-line bg-card shadow-card", className)} style={style}>
      <header className="flex min-h-[48px] items-center gap-2.5 px-4 pt-3.5">
        <span className="section-badge shrink-0">{String(index).padStart(2, "0")}</span>
        <h2 id={id} className="min-w-0 truncate font-display text-[15.5px] font-extrabold tracking-[-0.03em] text-ink">
          {title}
        </h2>
        {meta ? <span className="shrink-0 font-mono text-[11px] text-ink-3">{meta}</span> : null}
        <span className="flex-1" />
        {href ? (
          <Link href={href} className="group inline-flex shrink-0 items-center gap-1 rounded-sm text-[12px] font-medium text-ink-3 transition-colors hover:text-ink">
            {hrefLabel ?? "Tout voir"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ) : null}
      </header>
      <div className={cn("min-w-0 flex-1 px-4 pb-4 pt-3", bodyClassName)}>{children}</div>
    </section>
  );
}

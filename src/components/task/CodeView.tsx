"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

/** Texte brut avec numéros de ligne (fichiers non reconnus, journaux). */
export const CodeView = React.memo(function CodeView({ content, className, maxLines = 1500 }: { content: string; className?: string; maxLines?: number }) {
  const lines = React.useMemo(() => content.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n"), [content]);
  const shown = lines.length > maxLines ? lines.slice(0, maxLines) : lines;
  const gutter = `${String(lines.length).length + 1}ch`;
  return (
    <div className={cn("overflow-hidden rounded-md border border-line bg-paper-2", className)}>
      <pre className="scrollbar-thin m-0 overflow-x-auto py-2 font-mono text-[12px] leading-[1.6] text-ink">
        <code className="block min-w-max">
          {shown.map((l, i) => (
            <span key={i} className="flex">
              <span className="sticky left-0 shrink-0 select-none bg-paper-2 pl-3 pr-3 text-right text-ink-4" style={{ width: `calc(${gutter} + 1.5rem)` }}>
                {i + 1}
              </span>
              <span className="whitespace-pre pr-4">{l.length ? l : " "}</span>
            </span>
          ))}
        </code>
      </pre>
      {lines.length > maxLines ? (
        <div className="border-t border-line px-3 py-1.5 font-mono text-[11px] text-ink-3">{lines.length - maxLines} lignes non affichées</div>
      ) : null}
    </div>
  );
});

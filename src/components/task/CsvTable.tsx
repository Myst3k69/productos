"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";
import { isNumeric, parseCsv } from "./drawer-utils";

/** Tableau à partir d'un CSV : en-tête figé, colonnes numériques alignées à droite. */
export const CsvTable = React.memo(function CsvTable({ content, className, maxRows = 200 }: { content: string; className?: string; maxRows?: number }) {
  const rows = React.useMemo(() => parseCsv(content), [content]);
  if (!rows.length) return <p className="text-[13px] italic text-ink-3">Fichier vide.</p>;
  const [header, ...body] = rows;
  const shown = body.slice(0, maxRows);
  const numeric = header.map((_, ci) => shown.length > 0 && shown.every((r) => !r[ci]?.trim() || isNumeric(r[ci] ?? "")));
  return (
    <div className={cn("overflow-hidden rounded-md border border-line bg-card", className)}>
      <div className="scrollbar-thin max-h-[520px] overflow-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead className="sticky top-0 z-[1] bg-paper-2">
            <tr>
              {header.map((h, i) => (
                <th key={i} className={cn("whitespace-nowrap border-b border-line-2 px-3 py-2 text-left font-semibold text-ink-2", numeric[i] && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, ri) => (
              <tr key={ri} className="odd:bg-card even:bg-card-2/70 hover:bg-paper-3/60">
                {header.map((_, ci) => (
                  <td key={ci} className={cn("whitespace-nowrap border-b border-line px-3 py-1.5", numeric[ci] ? "text-right font-mono text-ink" : "text-ink-2")}>
                    {r[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-line bg-paper-2 px-3 py-1.5 font-mono text-[11px] text-ink-3">
        <span>
          {body.length} ligne{body.length > 1 ? "s" : ""} · {header.length} colonne{header.length > 1 ? "s" : ""}
        </span>
        {body.length > maxRows ? <span>{body.length - maxRows} lignes non affichées</span> : null}
      </div>
    </div>
  );
});

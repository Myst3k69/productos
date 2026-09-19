"use client";

import * as React from "react";
import parseDiff from "parse-diff";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/client/utils";
import { Chip } from "@/components/ui/chip";
import { CodeView } from "./CodeView";

type DiffFile = ReturnType<typeof parseDiff>[number];

/** Diff unifié git : un bloc repliable par fichier, numéros ancien/nouveau, hunks séparés. */
export const DiffViewer = React.memo(function DiffViewer({ content, className }: { content: string; className?: string }) {
  const files = React.useMemo(() => {
    try {
      return parseDiff(content);
    } catch {
      return [];
    }
  }, [content]);

  if (!files.length) return <CodeView content={content} className={className} />;

  const additions = files.reduce((a, f) => a + f.additions, 0);
  const deletions = files.reduce((a, f) => a + f.deletions, 0);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2 font-mono text-[11.5px] text-ink-3">
        <span>
          {files.length} fichier{files.length > 1 ? "s" : ""}
        </span>
        <span className="text-ok">+{additions}</span>
        <span className="text-danger">−{deletions}</span>
      </div>
      {files.map((f, i) => (
        <DiffFileBlock key={`${f.from ?? ""}→${f.to ?? ""}-${i}`} file={f} defaultOpen={files.length <= 4 || i === 0} />
      ))}
    </div>
  );
});

function fileName(f: DiffFile): string {
  if (f.deleted) return f.from ?? "fichier";
  if (f.to && f.to !== "/dev/null") return f.to;
  return f.from ?? "fichier";
}

function DiffFileBlock({ file, defaultOpen }: { file: DiffFile; defaultOpen: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const path = fileName(file);
  const renamed = !file.new && !file.deleted && file.from && file.to && file.from !== file.to && file.from !== "/dev/null";
  const status = file.new ? "nouveau" : file.deleted ? "supprimé" : renamed ? "renommé" : null;

  return (
    <div className="overflow-hidden rounded-md border border-line bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 bg-paper-2 px-3 py-2 text-left transition-colors hover:bg-paper-3"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-3" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />}
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink" title={renamed ? `${file.from} → ${file.to}` : path}>
          {path}
        </span>
        {status ? (
          <Chip size="xs" tone={file.new ? "ok" : file.deleted ? "danger" : "neutral"}>
            {status}
          </Chip>
        ) : null}
        <span className="shrink-0 font-mono text-[11px]">
          <span className="text-ok">+{file.additions}</span> <span className="text-danger">−{file.deletions}</span>
        </span>
      </button>

      {open ? (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[12px] leading-[1.55]">
            <tbody>
              {file.chunks.map((chunk, ci) => (
                <React.Fragment key={ci}>
                  <tr className="bg-paper-3/70 text-ink-3">
                    <td colSpan={3} className={cn("select-none px-3 py-1 text-[11px]", ci > 0 && "border-t border-line")}>
                      {chunk.content}
                    </td>
                  </tr>
                  {chunk.changes.map((ch, li) => {
                    const oldLn = ch.type === "normal" ? ch.ln1 : ch.type === "del" ? ch.ln : null;
                    const newLn = ch.type === "normal" ? ch.ln2 : ch.type === "add" ? ch.ln : null;
                    const text = ch.content.startsWith("\\") ? ch.content : ch.content.slice(1);
                    return (
                      <tr key={li} className={ch.type === "add" ? "bg-ok-soft/70" : ch.type === "del" ? "bg-danger-soft/70" : undefined}>
                        <td className="w-[1%] select-none whitespace-nowrap border-r border-line px-2 text-right text-ink-4">{oldLn ?? ""}</td>
                        <td className="w-[1%] select-none whitespace-nowrap border-r border-line px-2 text-right text-ink-4">{newLn ?? ""}</td>
                        <td className="whitespace-pre px-3">
                          <span className={cn("inline-block w-3 select-none", ch.type === "add" ? "text-ok" : ch.type === "del" ? "text-danger" : "text-ink-4")}>
                            {ch.type === "add" ? "+" : ch.type === "del" ? "−" : " "}
                          </span>
                          {text}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

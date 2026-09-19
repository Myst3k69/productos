import type { Artifact, ClarifyQuestion, Answer, IntegrationResult } from "@/lib/domain/types";

/* ─────────────────────────── Artefacts ─────────────────────────── */

export type ViewerKind = "diff" | "markdown" | "html" | "csv" | "code" | "link" | "commit";

/** Choisit le visualiseur adapté à un artefact (type, mime, extension). */
export function viewerKind(a: Pick<Artifact, "kind" | "title" | "path" | "mime">): ViewerKind {
  if (a.kind === "diff") return "diff";
  if (a.kind === "commit") return "commit";
  if (a.kind === "pr" || a.kind === "folder" || a.kind === "link") return "link";
  const name = (a.path ?? a.title).toLowerCase();
  const mime = (a.mime ?? "").toLowerCase();
  if (mime.includes("markdown") || name.endsWith(".md") || name.endsWith(".mdx")) return "markdown";
  if (mime.includes("html") || name.endsWith(".html") || name.endsWith(".htm")) return "html";
  if (mime.includes("csv") || name.endsWith(".csv") || name.endsWith(".tsv")) return "csv";
  return "code";
}

export function formatBytes(n: number | null | undefined): string {
  if (!n) return "";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace(".", ",").replace(",0", "")} ko`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

export const INTEGRATION_KIND_LABEL: Record<IntegrationResult["kind"], string> = {
  merge: "Fusionné",
  pr: "Pull request",
  branch: "Branche",
  folder: "Dossier",
  none: "Aucune",
};

export const COMPLEXITY_LABEL: Record<"S" | "M" | "L" | "XL", string> = {
  S: "Petite",
  M: "Moyenne",
  L: "Grande",
  XL: "Très grande",
};

/* ─────────────────────────── CSV ─────────────────────────── */

/** Analyse un CSV (guillemets, séparateur détecté : virgule, point-virgule ou tabulation). */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function isNumeric(s: string): boolean {
  return /^\s*-?\d+([.,]\d+)?\s*%?\s*$/.test(s);
}

/* ─────────────────────────── Données d'événement ─────────────────────────── */

export function asQuestions(data: Record<string, unknown> | null): ClarifyQuestion[] {
  const q = data?.questions;
  if (!Array.isArray(q)) return [];
  return q.filter((x): x is ClarifyQuestion => typeof x === "object" && x !== null && typeof (x as ClarifyQuestion).question === "string");
}

export function asAnswers(data: Record<string, unknown> | null): Answer[] {
  const a = data?.answers;
  if (!Array.isArray(a)) return [];
  return a.filter((x): x is Answer => typeof x === "object" && x !== null && typeof (x as Answer).answer === "string");
}

export function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

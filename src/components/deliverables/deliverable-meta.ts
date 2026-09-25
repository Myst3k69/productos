import { Database, FileText, Layers, LayoutTemplate, ListChecks, Palette, Rocket, Route, ShieldAlert, Users, type LucideIcon } from "lucide-react";
import type { Deliverable, DeliverableKind, DeliverableStatus } from "@/lib/buildos/types";
import { DELIVERABLE_KINDS, DELIVERABLE_META } from "@/lib/buildos/generate";
import type { Priority, TaskType } from "@/lib/domain/types";

export const DELIVERABLE_ICON: Record<DeliverableKind, LucideIcon> = {
  prd: FileText,
  personas: Users,
  user_flows: Route,
  wireframes: LayoutTemplate,
  data_model: Database,
  architecture: Layers,
  edge_cases: ShieldAlert,
  acceptance: ListChecks,
  brand: Palette,
  go_to_market: Rocket,
};

export const DELIVERABLE_STATUS_META: Record<DeliverableStatus, { label: string; tone: "neutral" | "ai" | "accent" | "ok" }> = {
  todo: { label: "À générer", tone: "neutral" },
  generating: { label: "Génération…", tone: "ai" },
  to_review: { label: "À valider", tone: "accent" },
  validated: { label: "Validé", tone: "ok" },
};

/** Ce que chaque livrable alimente (lecture : « le PRD alimente les personas »). */
export const DELIVERABLE_FEEDS: Record<DeliverableKind, DeliverableKind[]> = {
  prd: ["personas", "data_model"],
  personas: ["user_flows", "brand"],
  data_model: ["architecture"],
  user_flows: ["wireframes"],
  brand: ["go_to_market"],
  architecture: ["edge_cases"],
  wireframes: ["acceptance"],
  edge_cases: ["acceptance"],
  go_to_market: [],
  acceptance: [],
};

export function upstreamOf(kind: DeliverableKind): DeliverableKind[] {
  return DELIVERABLE_KINDS.filter((k) => DELIVERABLE_FEEDS[k].includes(kind));
}

function walk(kind: DeliverableKind, next: (k: DeliverableKind) => DeliverableKind[], acc = new Set<DeliverableKind>()): Set<DeliverableKind> {
  for (const k of next(kind)) {
    if (!acc.has(k)) {
      acc.add(k);
      walk(k, next, acc);
    }
  }
  return acc;
}

/** Tous les livrables reliés (en amont et en aval), pour la mise en évidence du schéma. */
export function relatedKinds(kind: DeliverableKind): Set<DeliverableKind> {
  const down = walk(kind, (k) => DELIVERABLE_FEEDS[k]);
  const up = walk(kind, upstreamOf);
  return new Set<DeliverableKind>([kind, ...down, ...up]);
}

/** Libellés courts pour le schéma de dépendances. */
export const MAP_LABEL: Record<DeliverableKind, string> = {
  prd: "PRD",
  personas: "Personas",
  user_flows: "Parcours",
  wireframes: "Wireframes",
  data_model: "Données",
  architecture: "Architecture",
  edge_cases: "Cas limites",
  acceptance: "Critères",
  brand: "Identité",
  go_to_market: "Lancement",
};

/* ─────────────────────────── Tâches issues d'un livrable ─────────────────────────── */

export const TASKABLE_KINDS: DeliverableKind[] = ["prd", "acceptance"];

export interface ProposedTask {
  title: string;
  spec: string;
  type: TaskType;
  priority: Priority;
}

/** Propose 2 à 3 tâches à partir du PRD (fonctionnalités) ou des critères d'acceptation. */
export function proposedTasks(d: Deliverable): ProposedTask[] {
  const lines = d.content.split("\n");
  if (d.kind === "prd") {
    const features = lines.map((l) => /^\d+\.\s+\*\*(.+?)\*\*/.exec(l)?.[1]).filter((x): x is string => !!x);
    return features.slice(0, 3).map((f, i) => ({
      title: f,
      spec: `Implémenter « ${f} », tel que décrit dans le PRD (v${d.version}).\n\nCritères : parcours nominal sur mobile et ordinateur, erreurs expliquées en français, temps de réponse inférieur à 500 ms.`,
      type: "code",
      priority: i === 0 ? "high" : "medium",
    }));
  }
  if (d.kind === "acceptance") {
    const out: ProposedTask[] = [];
    let current: { title: string; checks: string[] } | null = null;
    const flush = () => {
      if (current) {
        out.push({
          title: `Tests d'acceptation : ${current.title}`,
          spec: `Écrire et faire passer les tests d'acceptation de « ${current.title} ».\n\n${current.checks.join("\n")}`,
          type: "code",
          priority: out.length === 0 ? "high" : "medium",
        });
      }
    };
    for (const l of lines) {
      const h = /^##\s+(.+)$/.exec(l);
      if (h) {
        flush();
        current = { title: h[1].trim(), checks: [] };
      } else if (current && /^- \[[ x]\]/.test(l)) {
        current.checks.push(l);
      }
    }
    flush();
    return out.slice(0, 3);
  }
  return [];
}

/* ─────────────────────────── Export ─────────────────────────── */

export function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "projet"
  );
}

export function deliverableAsMarkdown(d: Deliverable): string {
  return d.format === "html" ? `# ${d.title}\n\n\`\`\`html\n${d.content}\n\`\`\`\n` : d.content.trim() + "\n";
}

export function foundationsMarkdown(projectName: string, list: Deliverable[]): string {
  const ordered = [...list].sort((a, b) => DELIVERABLE_META[a.kind].order - DELIVERABLE_META[b.kind].order);
  const status = (d: Deliverable) => (d.status === "validated" ? "validé" : d.status === "to_review" ? "à valider" : "brouillon");
  const toc = ordered.map((d, i) => `${i + 1}. ${d.title} — v${d.version}, ${status(d)}`).join("\n");
  const body = ordered.map(deliverableAsMarkdown).join("\n---\n\n");
  return `# Fondations — ${projectName}\n\n_Exporté depuis BuildOS le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}._\n\n## Sommaire\n${toc}\n\n---\n\n${body}`;
}

/** Téléchargement côté navigateur (Blob). */
export function downloadText(filename: string, content: string, mime = "text/markdown;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

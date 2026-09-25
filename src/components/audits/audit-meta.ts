import { Accessibility, Activity, Code2, Gauge, Layers, Search, ShieldCheck, Timer, TrendingUp, TriangleAlert, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AuditCategory, AuditFinding, AuditReport, HealthMetric, ProductMetric } from "@/lib/buildos/types";
import type { Priority } from "@/lib/domain/types";
import { fmtNumber } from "./chart-utils";

export const CATEGORY_META: Record<AuditCategory, { label: string; icon: LucideIcon; scope: string }> = {
  performance: { label: "Performance", icon: Gauge, scope: "Temps de chargement, poids des pages, requêtes" },
  securite: { label: "Sécurité", icon: ShieldCheck, scope: "En-têtes, dépendances, contrôle d'accès" },
  qualite: { label: "Qualité du code", icon: Code2, scope: "Tests, duplication, dette" },
  accessibilite: { label: "Accessibilité", icon: Accessibility, scope: "Contrastes, libellés, navigation au clavier" },
  seo: { label: "Référencement", icon: Search, scope: "Balises, indexation, vitesse" },
  produit: { label: "Produit", icon: TrendingUp, scope: "Parcours, conversion, abandons" },
};

/** Onglets affichés (ordre éditorial). */
export const REPORT_TABS: Array<{ value: "all" | AuditCategory; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "securite", label: "Sécurité" },
  { value: "performance", label: "Performance" },
  { value: "accessibilite", label: "Accessibilité" },
  { value: "produit", label: "Produit" },
];

/** Étapes affichées pendant un audit complet. */
export const AUDIT_STEPS: Array<{ category: AuditCategory; doing: string }> = [
  { category: "performance", doing: "Mesure des temps de chargement et du poids des pages" },
  { category: "securite", doing: "Analyse des en-têtes, dépendances et accès" },
  { category: "accessibilite", doing: "Contrôle des contrastes, libellés et du clavier" },
  { category: "produit", doing: "Lecture des parcours et des points d'abandon" },
];

type Severity = AuditFinding["severity"];

export const SEVERITY_META: Record<Severity, { label: string; rank: number; priority: Priority; className: string }> = {
  critique: { label: "Critique", rank: 0, priority: "urgent", className: "bg-danger text-white" },
  haute: { label: "Haute", rank: 1, priority: "high", className: "bg-danger-soft text-danger" },
  moyenne: { label: "Moyenne", rank: 2, priority: "medium", className: "bg-warn-soft text-warn" },
  basse: { label: "Basse", rank: 3, priority: "low", className: "border border-line-2 bg-card text-ink-3" },
};

export const EFFORT_META: Record<AuditFinding["effort"], { label: string; hint: string }> = {
  S: { label: "S", hint: "Effort S : moins d'une heure pour l'IA" },
  M: { label: "M", hint: "Effort M : une demi-journée environ" },
  L: { label: "L", hint: "Effort L : plusieurs jours, à découper" },
};

export function sortFindings(list: AuditFinding[]): AuditFinding[] {
  return [...list].sort((a, b) => Number(!!a.converted) - Number(!!b.converted) || SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank);
}

export function scoreTone(score: number): { label: string; text: string; stroke: string; bg: string } {
  if (score >= 85) return { label: "Bonne santé", text: "text-ok", stroke: "stroke-ok", bg: "bg-ok" };
  if (score >= 70) return { label: "À surveiller", text: "text-warn", stroke: "stroke-warn", bg: "bg-warn" };
  return { label: "À traiter vite", text: "text-danger", stroke: "stroke-danger", bg: "bg-danger" };
}

export function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return (h % 7) + 1;
}

/* ─────────────────────────── Santé ─────────────────────────── */

export const HEALTH_META: Record<HealthMetric["key"], { icon: LucideIcon; hint: string; format: (v: number) => string }> = {
  uptime: { icon: Activity, hint: "Part du temps où l'application répond, sur 14 jours.", format: (v) => `${fmtNumber(v, 2)} %` },
  latency: { icon: Timer, hint: "Temps de réponse médian des pages et de l'API.", format: (v) => `${fmtNumber(v)} ms` },
  errors: { icon: TriangleAlert, hint: "Part des requêtes qui échouent côté serveur.", format: (v) => `${fmtNumber(v, 2)} %` },
  debt: { icon: Layers, hint: "Indice de dette technique : plus il est bas, plus le code reste facile à faire évoluer.", format: (v) => `indice ${fmtNumber(v)}` },
  lighthouse: { icon: Gauge, hint: "Score de performance web mesuré sur mobile.", format: (v) => `${fmtNumber(v)} / 100` },
  security: { icon: ShieldCheck, hint: "Note de sécurité : en-têtes, dépendances, accès.", format: (v) => `${fmtNumber(v)} / 100` },
};

/* ─────────────────────────── Produit ─────────────────────────── */

export const PRODUCT_META: Record<string, { chart: "bars" | "line"; unit: string; format: (v: number) => string; caption: string }> = {
  visitors: { chart: "bars", unit: "visites", format: (v) => `${fmtNumber(v)} visites`, caption: "Visites par jour" },
  signups: { chart: "bars", unit: "inscriptions", format: (v) => `${fmtNumber(v)} inscriptions`, caption: "Nouveaux comptes par jour" },
  activation: { chart: "line", unit: "%", format: (v) => `${fmtNumber(v, 1)} %`, caption: "Comptes actifs après 7 jours" },
  revenue: { chart: "bars", unit: "€", format: (v) => `${fmtNumber(v)} €`, caption: "Revenu encaissé par jour" },
};

export function productMeta(key: string) {
  return PRODUCT_META[key] ?? { chart: "bars" as const, unit: "", format: (v: number) => fmtNumber(v), caption: "Par jour" };
}

/* ─────────────────────────── Tâches & export ─────────────────────────── */

export function findingTaskSpec(report: AuditReport, finding: AuditFinding): string {
  const cat = CATEGORY_META[report.category].label;
  const day = format(new Date(report.date), "d MMMM yyyy", { locale: fr });
  return [
    `## Contexte`,
    `Constat relevé par l'audit **${cat}** du ${day} (score ${report.score} / 100), sévérité **${SEVERITY_META[finding.severity].label.toLowerCase()}** :`,
    ``,
    `> ${finding.title}`,
    ``,
    `## Ce qu'il faut faire`,
    finding.recommendation,
    ``,
    `## Critères d'acceptation`,
    `- Le constat « ${finding.title} » n'apparaît plus au prochain audit ${cat.toLowerCase()}.`,
    `- Aucune régression sur les autres indicateurs de santé (disponibilité, temps de réponse, erreurs).`,
    `- La correction est couverte par un test automatisé quand c'est pertinent.`,
    ``,
    `_Effort estimé : ${finding.effort} — ${EFFORT_META[finding.effort].hint.split(" : ")[1]}._`,
  ].join("\n");
}

export function auditMarkdown(opts: { projectName: string; globalScore: number; health: HealthMetric[]; product: ProductMetric[]; reports: AuditReport[] }): string {
  const now = new Date();
  const lines: string[] = [];
  lines.push(`# Rapport d'audit — ${opts.projectName}`, ``, `_Généré par BuildOS le ${format(now, "d MMMM yyyy 'à' HH:mm", { locale: fr })}._`, ``);
  lines.push(`**Score global : ${opts.globalScore} / 100** — ${scoreTone(opts.globalScore).label}.`, ``);
  lines.push(`## Santé en production (14 jours)`, ``, `| Indicateur | Valeur | Variation |`, `|---|---|---|`);
  for (const h of opts.health) lines.push(`| ${h.label} | ${h.value} | ${h.delta} |`);
  lines.push(``, `## Produit`, ``, `| Indicateur | Valeur | Variation |`, `|---|---|---|`);
  for (const p of opts.product) lines.push(`| ${p.label} | ${p.value} | ${p.delta} |`);
  lines.push(``, `## Rapports`);
  for (const r of opts.reports) {
    lines.push(``, `### ${CATEGORY_META[r.category].label} — ${r.score} / 100`, ``, `_Audit du ${format(new Date(r.date), "d MMMM yyyy", { locale: fr })}._`, ``, r.summary, ``);
    lines.push(`| Sévérité | Constat | Recommandation | Effort | Statut |`, `|---|---|---|---|---|`);
    for (const f of sortFindings(r.findings)) {
      lines.push(`| ${SEVERITY_META[f.severity].label} | ${f.title} | ${f.recommendation} | ${f.effort} | ${f.converted ? "Tâche créée" : "Ouvert"} |`);
    }
  }
  lines.push(``, `---`, ``, `BuildOS — mesurer, améliorer, durablement.`, ``);
  return lines.join("\n");
}

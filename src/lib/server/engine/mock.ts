import fs from "node:fs/promises";
import path from "node:path";
import type { BuildResult, Plan, RefinedSpec, TaskType, VerifyResult } from "@/lib/domain/types";
import { TASK_TYPE_META } from "@/lib/domain/types";
import { guessTaskType, slugify } from "@/lib/domain/helpers";
import { EngineAbortError, type AIEngine, type EngineContext, type ProbeResult } from "./types";

/**
 * Moteur de démonstration : simule le comportement de l'IA (délais, outils, textes)
 * et produit de vrais fichiers pour que diff, aperçus et intégration fonctionnent.
 */
export class MockEngine implements AIEngine {
  readonly id = "mock" as const;

  private async wait(ctx: EngineContext, ms: number): Promise<void> {
    const speed = Math.max(0.25, ctx.settings.mockSpeed || 1);
    const d = Math.max(60, ms / speed);
    await new Promise<void>((resolve, reject) => {
      if (ctx.signal.aborted) return reject(new EngineAbortError());
      const t = setTimeout(resolve, d);
      ctx.signal.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new EngineAbortError());
      }, { once: true });
    });
  }

  private async tool(ctx: EngineContext, label: string, tool: string, input: Record<string, unknown>, ms = 600) {
    await ctx.emit("tool_use", label, { tool, input });
    await ctx.patch({ lastActivity: label });
    await this.wait(ctx, ms);
  }

  private async say(ctx: EngineContext, text: string, ms = 500) {
    await ctx.emit("text", text);
    await ctx.patch({ lastActivity: text.replace(/\s+/g, " ").slice(0, 140) });
    await this.wait(ctx, ms);
  }

  private async usage(ctx: EngineContext, tokens: number, ms: number) {
    await ctx.addUsage({ costUsd: (tokens / 1_000_000) * 12, inputTokens: Math.round(tokens * 0.8), outputTokens: Math.round(tokens * 0.2), durationMs: ms });
  }

  async probe(): Promise<ProbeResult> {
    return { ok: true, detail: "Mode démo actif (aucun appel réel à Claude).", model: "mock", latencyMs: 1 };
  }

  async clarify(ctx: EngineContext): Promise<RefinedSpec> {
    const t = ctx.task;
    const started = Date.now();
    await ctx.emit("system", "Session IA démarrée · mode démo", { model: "mock" });
    if (ctx.workspace.kind === "repo") {
      await this.tool(ctx, "Cherche des fichiers **/*", "Glob", { pattern: "**/*" }, 500);
      await this.tool(ctx, "Lit README.md", "Read", { file_path: "README.md" }, 400);
    }
    await this.say(ctx, `Je relis la spécification de « ${t.title} » et je formalise les critères d'acceptation.`, 700);
    const type: TaskType = t.type !== "other" ? t.type : guessTaskType(`${t.title} ${t.spec}`);
    const ask = t.answers.length === 0 && /\?|à définir|tbd|selon/i.test(t.spec) && ctx.task.iteration === 0;
    const spec: RefinedSpec = {
      title: t.title,
      summary: `${t.title} — ${TASK_TYPE_META[type].label.toLowerCase()} à livrer dans le projet ${ctx.project.name}.`,
      objective: t.spec.trim() ? firstSentence(t.spec) : `Livrer « ${t.title} » de façon utilisable immédiatement.`,
      deliverable: deliverableFor(type, t.title),
      suggestedType: type,
      acceptanceCriteria: criteriaFor(type, t.title),
      assumptions: ["Le ton et le vocabulaire suivent le contexte du projet.", "Aucune dépendance externe payante n'est ajoutée."],
      outOfScope: ["Tout ce qui n'est pas explicitement mentionné dans la spécification."],
      questions: ask
        ? [{ id: "q1", question: "Quelle cible prioritaire faut-il adresser en premier ?", why: "La spec laisse plusieurs lectures possibles.", options: ["Grand public", "Professionnels", "Les deux"], blocking: true }]
        : [],
      complexity: t.spec.length > 600 ? "L" : t.spec.length > 200 ? "M" : "S",
    };
    await this.usage(ctx, 2400, Date.now() - started);
    return spec;
  }

  async plan(ctx: EngineContext): Promise<Plan> {
    const started = Date.now();
    const t = ctx.task;
    const type = t.type;
    await this.say(ctx, "Je découpe le travail en étapes vérifiables.", 600);
    if (ctx.workspace.kind === "repo") await this.tool(ctx, "Recherche « export default »", "Grep", { pattern: "export default" }, 500);
    const steps = stepsFor(type, t.title).map((s, i) => ({ id: `s${i + 1}`, title: s[0], detail: s[1], status: "pending" as const }));
    const plan: Plan = {
      approach: `Approche incrémentale : produire d'abord une version complète mais simple de « ${t.title} », puis l'affiner en vérifiant chaque critère d'acceptation.`,
      steps,
      filesLikely: ctx.workspace.kind === "repo" ? [`src/${slugify(t.title)}.ts`, "README.md"] : [`${slugify(t.title)}.md`],
      risks: ["Spécification incomplète sur certains détails — hypothèses documentées dans les notes."],
      verification: ctx.workspace.kind === "repo" ? ["Compilation / tests du projet", "Relecture des critères d'acceptation"] : ["Relecture structurée du livrable", "Vérification de chaque critère d'acceptation"],
      estimateMinutes: 8 + steps.length * 3,
    };
    await this.usage(ctx, 3100, Date.now() - started);
    return plan;
  }

  async build(ctx: EngineContext): Promise<BuildResult> {
    const started = Date.now();
    const t = ctx.task;
    const plan = t.plan;
    const ws = ctx.workspace;
    const slug = slugify(t.title);
    const changes: BuildResult["changes"] = [];

    if (plan) {
      for (let i = 0; i < plan.steps.length; i++) {
        const steps = plan.steps.map((s, j) => ({ ...s, status: j < i ? ("done" as const) : j === i ? ("running" as const) : ("pending" as const) }));
        await ctx.patch({ plan: { ...plan, steps } });
        await ctx.emit("progress", `Étape ${i + 1}/${plan.steps.length} : ${plan.steps[i].title}`, { step: i, total: plan.steps.length });
        await this.say(ctx, plan.steps[i].detail ?? plan.steps[i].title, 500);
        if (i === 0 && ws.kind === "repo") await this.tool(ctx, "Lit package.json", "Read", { file_path: "package.json" }, 400);
        if (i === 1) await this.tool(ctx, "Exécute : ls -la", "Bash", { command: "ls -la" }, 400);
      }
      await ctx.patch({ plan: { ...plan, steps: plan.steps.map((s) => ({ ...s, status: "done" as const })) } });
    }

    if (ws.kind === "repo") {
      const dir = path.join(ws.path, "atelier", slug);
      await fs.mkdir(dir, { recursive: true });
      const main = path.join(dir, "README.md");
      await this.tool(ctx, `Écrit atelier/${slug}/README.md`, "Write", { file_path: main }, 500);
      await fs.writeFile(main, deliverableMarkdown(ctx, "code"), "utf8");
      changes.push({ path: `atelier/${slug}/README.md`, action: "created", summary: "Note d'implémentation (mode démo)" });
      const code = path.join(dir, `${slug}.ts`);
      await this.tool(ctx, `Écrit atelier/${slug}/${slug}.ts`, "Write", { file_path: code }, 400);
      await fs.writeFile(code, sampleCode(t.title, slug), "utf8");
      changes.push({ path: `atelier/${slug}/${slug}.ts`, action: "created", summary: "Module TypeScript d'exemple" });
      if (t.iteration > 0) {
        await this.tool(ctx, `Modifie atelier/${slug}/README.md`, "Edit", { file_path: main }, 400);
        await fs.appendFile(main, `\n\n## Itération ${t.iteration}\n\nRetours pris en compte :\n${t.feedback.map((f) => `- ${f.comment}`).join("\n")}\n`, "utf8");
        changes[0] = { ...changes[0], action: "modified" };
      }
    } else {
      const main = path.join(ws.path, `${slug}.md`);
      await this.tool(ctx, `Écrit ${slug}.md`, "Write", { file_path: main }, 600);
      await fs.writeFile(main, deliverableMarkdown(ctx, t.type), "utf8");
      changes.push({ path: `${slug}.md`, action: t.iteration > 0 ? "modified" : "created", summary: "Livrable principal" });
      if (t.type === "marketing" || t.type === "design") {
        const html = path.join(ws.path, `${slug}.html`);
        await this.tool(ctx, `Écrit ${slug}.html`, "Write", { file_path: html }, 500);
        await fs.writeFile(html, sampleHtml(ctx), "utf8");
        changes.push({ path: `${slug}.html`, action: "created", summary: "Maquette HTML autonome" });
      }
      if (t.iteration > 0) {
        await fs.appendFile(main, `\n\n## Itération ${t.iteration}\n\nRetours pris en compte :\n${t.feedback.map((f) => `- ${f.comment}`).join("\n")}\n`, "utf8");
      }
    }

    await this.say(ctx, "Fabrication terminée. Je résume ce que j'ai produit.", 400);
    await this.usage(ctx, 18_000, Date.now() - started);
    return {
      summary: `J'ai produit « ${t.title} » (${changes.length} fichier${changes.length > 1 ? "s" : ""}). Mode démo : le contenu est illustratif mais la chaîne complète (fichiers, diff, validation, intégration) est réelle.`,
      changes,
      notes: ["Généré par le moteur de démonstration — connectez Claude pour une vraie exécution.", "Les hypothèses du cadrage ont été appliquées telles quelles."],
      primaryFile: changes[0]?.path,
    };
  }

  async verify(ctx: EngineContext): Promise<VerifyResult> {
    const started = Date.now();
    const t = ctx.task;
    await this.say(ctx, "Je vérifie le livrable contre chaque critère d'acceptation.", 500);
    if (ctx.workspace.kind === "repo") await this.tool(ctx, "Exécute : npm test --if-present", "Bash", { command: "npm test --if-present" }, 900);
    await this.tool(ctx, `Lit ${t.buildResult?.primaryFile ?? "le livrable"}`, "Read", { file_path: t.buildResult?.primaryFile }, 500);
    const criteria = (t.refinedSpec?.acceptanceCriteria ?? []).map((c, i) => ({ criterion: c, met: true, evidence: i === 0 ? "Section dédiée dans le livrable." : "Vérifié à la relecture." }));
    const failFirst = t.iteration === 0 && /strict|exigeant|complet/i.test(t.spec) && ctx.settings.maxAutoFixLoops > 0;
    const result: VerifyResult = {
      passed: !failFirst,
      summary: failFirst
        ? "Un critère n'est pas pleinement couvert : je renvoie une itération de correction."
        : "Tous les critères sont couverts. Le résultat est prêt pour votre validation.",
      checks: [
        { name: ctx.workspace.kind === "repo" ? "Tests du projet" : "Structure du document", status: "pass", detail: ctx.workspace.kind === "repo" ? "Aucun test défini, compilation OK." : "Titre, sections et conclusion présents." },
        { name: "Cohérence avec la spécification", status: failFirst ? "fail" : "pass", detail: failFirst ? "Un détail de la spec manque." : "Conforme." },
      ],
      criteria: failFirst ? criteria.map((c, i) => (i === criteria.length - 1 ? { ...c, met: false, evidence: "Non traité dans cette itération." } : c)) : criteria,
      issues: failFirst ? ["Compléter le dernier critère d'acceptation."] : [],
      confidence: failFirst ? 0.55 : 0.86,
    };
    await this.usage(ctx, 5200, Date.now() - started);
    return result;
  }
}

/* ───────────────────────────── Contenus ───────────────────────────── */

function firstSentence(s: string): string {
  const line = s.split("\n").map((l) => l.trim()).find(Boolean) ?? s;
  return line.replace(/^#+\s*/, "").slice(0, 200);
}

function deliverableFor(type: TaskType, title: string): string {
  switch (type) {
    case "code":
    case "ops":
      return `Modifications de code intégrées sur une branche dédiée pour « ${title} ».`;
    case "document":
      return `Document structuré en Markdown : « ${title} ».`;
    case "research":
      return `Rapport de recherche avec synthèse, tableau comparatif et recommandations.`;
    case "marketing":
      return `Textes prêts à publier (titres, accroches, appels à l'action) + maquette HTML.`;
    case "design":
      return `Maquette HTML autonome et notes de design.`;
    case "data":
      return `Analyse documentée avec tableaux et recommandations.`;
    default:
      return `Livrable Markdown : « ${title} ».`;
  }
}

function criteriaFor(type: TaskType, title: string): string[] {
  const base = [`Le livrable répond directement à « ${title} ».`, "Le contenu est utilisable tel quel, sans retouche majeure."];
  switch (type) {
    case "code":
    case "ops":
      return [...base, "Le projet compile et les tests existants passent.", "Les changements sont limités au périmètre de la tâche."];
    case "research":
      return [...base, "Au moins trois sources ou concurrents sont comparés.", "Une recommandation claire conclut le rapport."];
    case "marketing":
      return [...base, "Le message principal tient en une phrase.", "Un appel à l'action explicite est présent."];
    default:
      return [...base, "Le document a un titre, des sections et une conclusion."];
  }
}

function stepsFor(type: TaskType, title: string): [string, string][] {
  switch (type) {
    case "code":
    case "ops":
      return [
        ["Explorer le code existant", "Repérer les conventions et les points d'intégration."],
        ["Implémenter la fonctionnalité", `Écrire le code de « ${title} » avec les types nécessaires.`],
        ["Ajouter des tests", "Couvrir les cas nominaux et limites."],
        ["Documenter", "Mettre à jour le README et les commentaires utiles."],
      ];
    case "research":
      return [
        ["Cadrer la question", "Définir périmètre, critères et sources."],
        ["Collecter", "Rassembler les données et exemples."],
        ["Comparer", "Construire le tableau comparatif."],
        ["Recommander", "Conclure avec une recommandation argumentée."],
      ];
    case "marketing":
      return [
        ["Clarifier la promesse", "Une phrase, une cible, un bénéfice."],
        ["Rédiger les textes", "Titres, accroches, preuves, appel à l'action."],
        ["Assembler la maquette", "Page HTML autonome prête à tester."],
      ];
    default:
      return [
        ["Structurer", "Plan du document et sections."],
        ["Rédiger", "Contenu complet, ton adapté."],
        ["Relire", "Cohérence, clarté, conclusion."],
      ];
  }
}

function deliverableMarkdown(ctx: EngineContext, type: TaskType): string {
  const t = ctx.task;
  const r = t.refinedSpec;
  const lines = [
    `# ${t.title}`,
    "",
    `> Généré par Atelier (mode démo) pour le projet **${ctx.project.name}** — ${new Date().toLocaleDateString("fr-FR")}`,
    "",
    "## Objectif",
    "",
    r?.objective ?? t.spec ?? "",
    "",
    "## Contenu",
    "",
  ];
  if (type === "research") {
    lines.push("| Option | Forces | Limites | Verdict |", "|---|---|---|---|", "| A | Rapide à mettre en place | Peu différenciant | À tester |", "| B | Très différenciant | Coût initial élevé | Recommandé |", "| C | Standard du marché | Concurrence forte | Écarté |", "");
    lines.push("## Recommandation", "", "Partir sur l'option **B** avec une expérimentation courte de deux semaines.", "");
  } else if (type === "marketing") {
    lines.push("**Accroche :** La façon la plus simple de transformer une idée en produit en sept jours.", "", "**Sous-titre :** Un cadre, une méthode, un accompagnement — et un MVP réel à la fin de la semaine.", "", "**Appel à l'action :** Réserver ma place", "");
  } else if (type === "code" || type === "ops") {
    lines.push("Ce dossier contient une note d'implémentation et un module d'exemple créés par le moteur de démonstration.", "", "```", `atelier/${slugify(t.title)}/`, "```", "");
  } else {
    lines.push("### Section 1", "", "Contenu principal du livrable, rédigé à partir de la spécification.", "", "### Section 2", "", "Détails, exemples et points d'attention.", "");
  }
  if (r?.acceptanceCriteria?.length) {
    lines.push("## Critères d'acceptation couverts", "", ...r.acceptanceCriteria.map((c) => `- [x] ${c}`), "");
  }
  lines.push("## Conclusion", "", "Livrable prêt pour validation. Les points ouverts sont listés dans les notes de la tâche.", "");
  return lines.join("\n");
}

function sampleCode(title: string, slug: string): string {
  const name = slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return `/**
 * ${title}
 * Module d'exemple généré par Atelier (mode démo).
 */
export interface ${cap(name)}Options {
  enabled?: boolean;
}

export function ${name}(options: ${cap(name)}Options = {}): string {
  const enabled = options.enabled ?? true;
  return enabled ? "${title} : actif" : "${title} : inactif";
}
`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sampleHtml(ctx: EngineContext): string {
  const t = ctx.task;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(t.title)}</title>
<style>
  body { margin:0; font-family: Georgia, serif; background:#f5f1e8; color:#17150f; }
  main { max-width: 720px; margin: 0 auto; padding: 72px 24px; }
  h1 { font-size: 44px; line-height: 1.05; margin: 0 0 16px; }
  p { font-size: 18px; line-height: 1.6; }
  .cta { display:inline-block; margin-top: 24px; padding: 14px 22px; background:#e4572e; color:#fff; border-radius: 999px; text-decoration:none; font-weight:600; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(t.title)}</h1>
  <p>${escapeHtml(t.refinedSpec?.objective ?? t.spec ?? "")}</p>
  <a class="cta" href="#">Réserver ma place</a>
</main>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

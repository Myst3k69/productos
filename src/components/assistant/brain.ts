import type { Project, Task } from "@/lib/domain/types";
import type { ClubEvent, Deliverable, JourneyStep, ProjectBrief, Release } from "@/lib/buildos/types";
import { needsHuman } from "@/lib/domain/helpers";
import { uid } from "@/lib/client/utils";
import { useStore } from "@/lib/client/store";
import { useBuildOS } from "@/lib/buildos/store";
import type { AssistantMessage, PlanItem } from "./types";
import { GENERIC_QUESTIONS, extractNeed, findTopic, topicById, type TopicTask } from "./topics";

/* ═══════════════════════════ Contexte ═══════════════════════════ */

export interface BrainContext {
  firstName: string;
  project: Project | null;
  tasks: Task[];
  deliverables: Deliverable[];
  releases: Release[];
  journey: JourneyStep[];
  events: ClubEvent[];
  brief: ProjectBrief | null;
}

/** Lit l'état courant des deux stores (au moment de répondre, pas au moment d'écrire). */
export function readContext(projectId: string): BrainContext {
  const s = useStore.getState();
  const b = useBuildOS.getState();
  const name = b.profile?.name?.trim() ?? "";
  return {
    firstName: name ? name.split(/\s+/)[0] : "",
    project: s.projects.find((p) => p.id === projectId) ?? null,
    tasks: Object.values(s.tasks).filter((t) => t.projectId === projectId),
    deliverables: b.deliverables[projectId] ?? [],
    releases: b.releases[projectId] ?? [],
    journey: b.journeys[projectId] ?? [],
    events: b.events,
    brief: b.briefs[projectId] ?? null,
  };
}

export const DEFAULT_SUGGESTIONS = ["Ajouter une fonctionnalité", "Où en est mon projet ?", "Prépare ma mise en prod", "Écris mon pitch"];

/* ═══════════════════════════ Accueil ═══════════════════════════ */

export function welcomeText(ctx: BrainContext): string {
  const hello = ctx.firstName ? `Bonjour ${ctx.firstName} !` : "Bonjour !";
  const where = ctx.project ? ` Je suis votre assistant sur **${ctx.project.name}**.` : "";
  const review = ctx.tasks.filter((t) => t.status === "waiting_review").length;
  const questions = ctx.tasks.filter((t) => t.status === "waiting_input").length;
  const parts: string[] = [];
  if (review) parts.push(`**${review} tâche${review > 1 ? "s" : ""}** attend${review > 1 ? "ent" : ""} votre validation`);
  if (questions) parts.push(`**${questions} question${questions > 1 ? "s" : ""}** de l'IA reste${questions > 1 ? "nt" : ""} sans réponse`);
  const state = parts.length ? ` ${capitalize(parts.join(" et "))}.` : " Rien ne vous attend pour l'instant : l'IA avance.";
  return `${hello}${where}${state}\n\nDécrivez ce que vous voulez construire : je pose les bonnes questions, puis je prépare les tâches et le bon agent pour chacune.`;
}

/* ═══════════════════════════ Réponse ═══════════════════════════ */

const RE = {
  cancel: /^(annule|annuler|laisse tomber|oublie|stop|non merci)\b/i,
  status: /o[uù] en est|avancement|statut|[ée]tat du projet|r[ée]sum[ée]|bilan|fais (le|un) point|progress|combien de t[aâ]ches/i,
  release: /mise en prod|mettre en prod|d[ée]ploi|d[ée]ployer|release|mise en ligne|mettre en ligne|pr[ée]prod/i,
  pitch: /pitch|investisseur|lev[ée]e de fonds|elevator/i,
  addFeature: /^ajouter une fonctionnalit[ée]\s*$/i,
  feature: /je veux|je voudrais|j'aimerais|je souhaite|ajoute|ajouter|cr[ée]er|cr[ée]e |construire|il faut|il faudrait|besoin|fonctionnalit|int[ée]gr|permettre|d[ée]velopp|mettre en place/i,
  greeting: /^(bonjour|bonsoir|salut|hello|coucou|hey)\b/i,
  thanks: /^(merci|super|parfait|g[ée]nial|top|ok|d'accord)\b/i,
  help: /aide|que (peux|pouvez)|quoi faire|comment (tu|vous) (marche|fonctionne)|qu'est-ce que tu/i,
  unknown: /je ne sais pas|aucune id[ée]e|proposez|propose-moi|[àa] vous de voir/i,
};

function msg(partial: Omit<AssistantMessage, "id" | "at" | "role">): AssistantMessage {
  return { id: uid("m"), at: new Date().toISOString(), role: "assistant", ...partial };
}

/** Le dernier message de l'assistant attend-il des réponses de cadrage ? */
function pendingQuestions(thread: AssistantMessage[]): AssistantMessage | null {
  for (let i = thread.length - 1; i >= 0; i--) {
    const m = thread[i];
    if (m.role !== "assistant") continue;
    return m.kind === "questions" ? m : null;
  }
  return null;
}

export function reply(text: string, thread: AssistantMessage[], ctx: BrainContext): AssistantMessage {
  const t = text.trim();
  const pending = pendingQuestions(thread);

  if (pending && RE.cancel.test(t)) {
    return msg({ text: "D'accord, on laisse ça de côté. Je reste là quand vous voulez reprendre.", suggestions: DEFAULT_SUGGESTIONS });
  }
  if (RE.status.test(t)) return statusReply(ctx);
  if (RE.release.test(t)) return releaseReply(ctx);
  if (RE.pitch.test(t)) return pitchReply(ctx);
  if (pending) return planReply(pending, t, ctx);
  if (RE.addFeature.test(t)) {
    return msg({
      text: "Avec plaisir. Décrivez la fonctionnalité en une ou deux phrases, comme vous l'expliqueriez à un associé : pour qui, et ce que ça doit permettre.",
      suggestions: ["Je veux ajouter le paiement en ligne", "Ajoute un espace d'administration", "Je veux envoyer des rappels par email"],
    });
  }
  if (RE.feature.test(t) || t.length > 60) return questionsReply(t);
  if (RE.greeting.test(t)) {
    return msg({ text: `Bonjour${ctx.firstName ? ` ${ctx.firstName}` : ""} ! Par quoi commence-t-on ?`, suggestions: DEFAULT_SUGGESTIONS });
  }
  if (RE.thanks.test(t)) {
    return msg({ text: "Avec plaisir. Autre chose à faire avancer ?", suggestions: DEFAULT_SUGGESTIONS });
  }
  if (RE.help.test(t)) {
    return msg({
      text: [
        "Je peux :",
        "- **transformer une idée en tâches** prêtes à confier à l'IA, avec le bon agent pour chacune ;",
        "- **faire le point** sur votre projet, chiffres à l'appui ;",
        "- **préparer votre mise en production** ;",
        "- **écrire un premier jet de pitch**.",
        "",
        "Commencez par me dire ce que vous voulez construire.",
      ].join("\n"),
      suggestions: DEFAULT_SUGGESTIONS,
    });
  }
  return msg({
    text: "Je n'ai pas bien saisi. Pouvez-vous décrire ce que vous voulez construire ou savoir ? Par exemple : « Je veux que mes clients puissent payer en ligne ».",
    suggestions: DEFAULT_SUGGESTIONS,
  });
}

/* ─────────────── Cadrage : questions numérotées ─────────────── */

function questionsReply(text: string): AssistantMessage {
  const topic = findTopic(text);
  const need = topic?.id === "app" ? text.trim().replace(/[.!?]+$/, "") : extractNeed(text);
  const questions = (topic?.questions ?? GENERIC_QUESTIONS).slice(0, 4);
  const intro = topic?.id === "app" ? "Super ! Pour bien cadrer, j'ai quelques questions :" : `Bonne idée. Pour bien cadrer ${topic ? topic.label : "cette fonctionnalité"}, j'ai quelques questions :`;
  return msg({
    kind: "questions",
    text: intro,
    questions,
    need,
    topic: topic?.id,
    suggestions: ["Je ne sais pas encore, proposez-moi", "Annuler"],
  });
}

/* ─────────────── Plan : 2 à 4 tâches ─────────────── */

function planReply(pending: AssistantMessage, answer: string, ctx: BrainContext): AssistantMessage {
  const topic = topicById(pending.topic);
  const need = pending.need ?? "cette fonctionnalité";
  const unsure = RE.unknown.test(answer);
  const shortNeed = need.length > 48 ? `${need.slice(0, 45).replace(/\s+\S*$/, "")}…` : need;
  const base: TopicTask[] = topic?.tasks ?? [
    { title: `Cadrer « ${shortNeed} » : parcours et critères`, type: "document", priority: "medium", goal: "Parcours utilisateur, règles de gestion, critères d'acceptation testables." },
    { title: `Maquetter les écrans de « ${shortNeed} »`, type: "design", priority: "medium", goal: "Wireframes HTML des écrans concernés, états vides et erreurs compris." },
    { title: `Développer « ${shortNeed} »`, type: "code", priority: "high", goal: "Implémentation complète, testée, prête pour la revue humaine." },
    { title: `Tester les cas limites de « ${shortNeed} »`, type: "code", priority: "low", goal: "Tests automatisés sur les scénarios à risque identifiés au cadrage." },
  ];
  const wantsLess = /simple|minimum|mvp|rapide|l[ée]ger/i.test(answer);
  const picked = base.slice(0, wantsLess ? Math.max(2, base.length - 1) : 4);

  const qa = (pending.questions ?? []).map((q, i) => `${i + 1}. ${q}`).join("\n");
  const items: PlanItem[] = picked.map((task) => ({
    id: uid("pi"),
    title: task.title,
    type: task.type,
    priority: task.priority,
    spec: [
      `Besoin exprimé : ${need}.`,
      "",
      `Objectif : ${task.goal}`,
      "",
      "Questions de cadrage :",
      qa,
      "",
      `Réponses du fondateur : ${unsure ? "à proposer par l'IA (hypothèses raisonnables, à expliciter)." : answer.trim()}`,
      ctx.project?.context ? `\nContexte du projet : ${ctx.project.context}` : "",
    ]
      .join("\n")
      .trim(),
  }));

  const text = unsure
    ? `Pas de souci, je pars sur des hypothèses raisonnables que l'IA expliquera au cadrage. Voici le plan que je vous propose pour **${need}** :`
    : `Merci, c'est clair. Voici le plan que je vous propose pour **${need}** — chaque tâche part vers l'agent le plus adapté :`;
  return msg({ kind: "plan", text, plan: { need, items, state: "proposed" } });
}

/* ─────────────── Point d'étape chiffré ─────────────── */

function statusReply(ctx: BrainContext): AssistantMessage {
  const { tasks } = ctx;
  if (!ctx.project) return msg({ text: "Aucun projet sélectionné pour l'instant.", suggestions: DEFAULT_SUGGESTIONS });
  const done = tasks.filter((t) => t.stage === "done").length;
  const running = tasks.filter((t) => t.status === "running" || t.status === "queued").length;
  const review = tasks.filter((t) => t.status === "waiting_review");
  const questions = tasks.filter((t) => t.status === "waiting_input");
  const failed = tasks.filter((t) => t.status === "failed");
  const attention = tasks.filter(needsHuman).length;
  const validated = ctx.deliverables.filter((d) => d.status === "validated").length;
  const toReview = ctx.deliverables.filter((d) => d.status === "to_review").length;
  const pendingRelease = ctx.releases.find((r) => r.env === "review" && r.status === "waiting");
  const live = ctx.releases.find((r) => r.env === "production");
  const today = ctx.journey.find((s) => !s.done);
  const journeyDone = ctx.journey.filter((s) => s.done).length;

  const lines = [
    `Voici où en est **${ctx.project.name}** :`,
    "",
    `- **${done}/${tasks.length}** tâches terminées, **${running}** en cours avec l'IA`,
    attention
      ? `- **${attention}** à traiter : ${[review.length ? `${review.length} validation${review.length > 1 ? "s" : ""}` : "", questions.length ? `${questions.length} question${questions.length > 1 ? "s" : ""}` : "", failed.length ? `${failed.length} échec${failed.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ")}`
      : "- Rien ne vous attend côté tâches",
    ctx.deliverables.length ? `- Fondations : **${validated}/${ctx.deliverables.length}** validées${toReview ? `, ${toReview} à relire` : ""}` : "",
    pendingRelease ? `- Mise en prod : la **${pendingRelease.version}** attend votre revue` : live ? `- En production : **${live.version}**` : "",
    today ? `- Parcours : **jour ${today.day}/7** — ${today.title} (${journeyDone} étape${journeyDone > 1 ? "s" : ""} bouclée${journeyDone > 1 ? "s" : ""})` : ctx.journey.length ? "- Parcours de lancement : bouclé 🎉" : "",
  ].filter(Boolean);

  let advice = "";
  if (failed[0]) advice = `Je commencerais par relancer « ${failed[0].title} » : elle bloque la suite.`;
  else if (questions[0]) advice = `Je commencerais par répondre à la question de l'IA sur « ${questions[0].title} » : deux minutes, et elle repart.`;
  else if (review[0]) advice = `Je commencerais par valider « ${review[0].title} » : l'IA pourra l'intégrer tout de suite.`;
  else if (pendingRelease) advice = `Prochaine étape : relire la ${pendingRelease.version} pour l'envoyer en préproduction.`;
  else if (toReview) advice = "Prochaine étape : relire les fondations en attente.";
  if (advice) lines.push("", advice);

  const links = [{ label: "Ouvrir le tableau", href: "/board" }];
  if (toReview) links.push({ label: "Fondations", href: "/deliverables" });
  if (pendingRelease) links.push({ label: "Mise en prod", href: "/releases" });
  return msg({ text: lines.join("\n"), links, suggestions: ["Prépare ma mise en prod", "Ajouter une fonctionnalité"] });
}

/* ─────────────── Préparer la mise en production ─────────────── */

function releaseReply(ctx: BrainContext): AssistantMessage {
  const pending = ctx.releases.find((r) => r.env === "review" && r.status === "waiting") ?? ctx.releases.find((r) => r.env === "staging");
  const inReview = ctx.tasks.filter((t) => t.stage === "review" && t.status === "waiting_review");
  const lines: string[] = [];
  if (pending) {
    lines.push(`La **${pending.version} — ${pending.title}** est ${pending.env === "review" ? "en attente de votre revue" : "en préproduction"}. Contrôles :`, "");
    for (const c of pending.checks) lines.push(`- ${c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "…"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  } else {
    lines.push("Aucune version n'est en cours de revue. On peut en préparer une.");
  }
  if (inReview.length) lines.push("", `${inReview.length} tâche${inReview.length > 1 ? "s" : ""} attend${inReview.length > 1 ? "ent" : ""} encore votre validation avant d'embarquer dans la version.`);
  lines.push("", "Pour sécuriser la mise en ligne, je vous propose ces tâches :");

  const version = pending?.version ?? "la prochaine version";
  const items: PlanItem[] = [
    { title: "Vérifier la configuration de production", type: "ops", priority: "high", spec: "Variables d'environnement, domaines, certificats, sauvegardes automatiques et alertes. Liste de contrôle signée avant la bascule." },
    { title: "Tester de bout en bout les parcours critiques", type: "code", priority: "high", spec: "Inscription, action clé, paiement : tests automatisés sur la préproduction, captures en cas d'échec." },
    { title: `Rédiger les notes de version ${pending?.version ?? ""}`.trim(), type: "document", priority: "medium", spec: `Notes de version pour ${version} : nouveautés en langage client, correctifs, points d'attention pour le support.` },
  ].map((x) => ({ ...x, id: uid("pi"), type: x.type as PlanItem["type"], priority: x.priority as PlanItem["priority"] }));

  return msg({ kind: "plan", text: lines.join("\n"), plan: { need: `la mise en production de ${version}`, items, state: "proposed" }, links: [{ label: "Voir la mise en prod", href: "/releases" }] });
}

/* ─────────────── Pitch ─────────────── */

function pitchReply(ctx: BrainContext): AssistantMessage {
  const name = ctx.project?.name ?? "votre projet";
  const brief = ctx.brief;
  const audience = brief?.audience?.trim() || "les indépendants et petites équipes";
  const problem = brief?.problem?.trim() || ctx.project?.description?.trim() || "ils perdent des heures sur des tâches qui devraient prendre des minutes";
  const features = brief?.features?.slice(0, 3) ?? [];
  const done = ctx.tasks.filter((t) => t.stage === "done").length;
  const live = ctx.releases.find((r) => r.env === "production");

  const stage = live ? `la ${live.version} est en ligne` : "le MVP est en construction";
  const shipped = done ? `, ${done} fonctionnalité${done > 1 ? "s" : ""} livrée${done > 1 ? "s" : ""}` : "";
  const lines = [
    "Voici un premier jet, à dérouler en 30 secondes :",
    "",
    `> **${name}** — pour ${lowerFirst(stripDot(audience))}.  `,
    `> **Le problème** : ${lowerFirst(stripDot(problem))}.  `,
    `> **La solution** : ${features.length ? features.map((f) => lowerFirst(stripDot(f))).join(", ") : "un parcours simple, de bout en bout, sans friction"}.  `,
    `> **Où nous en sommes** : ${stage}${shipped}.  `,
    "> **Ce que nous cherchons** : nos 10 premiers clients pilotes.",
    "",
    "Structure conseillée pour le deck : **problème · solution · démo · marché · traction · équipe · demande**.",
  ];
  const items: PlanItem[] = [
    { id: uid("pi"), title: "Rédiger le pitch deck en 10 diapositives", type: "document", priority: "high", spec: `Deck de pitch pour ${name} : problème, solution, démo, marché, modèle économique, traction, concurrence, équipe, feuille de route, demande. Ton direct, une idée par diapositive.` },
    { id: uid("pi"), title: "Préparer le script de démo de 2 minutes", type: "marketing", priority: "medium", spec: `Script minuté de la démo de ${name} : situation de départ, 3 actions clés, effet « waouh », conclusion chiffrée.` },
  ];
  return msg({ kind: "plan", text: lines.join("\n"), plan: { need: "votre pitch", items, state: "proposed" } });
}

/* ═══════════════════════════ Outils ═══════════════════════════ */

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function lowerFirst(s: string): string {
  return s && !/^[A-Z]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
function stripDot(s: string): string {
  return s.replace(/[.!]+$/, "");
}

/** Délai d'écriture simulé, proportionnel à la longueur de la réponse. */
export function typingDelay(m: AssistantMessage): number {
  const len = m.text.length + (m.questions?.join("").length ?? 0) + (m.plan ? 220 : 0);
  return Math.min(2400, 650 + len * 3.2);
}

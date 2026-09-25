import type { Project, Task } from "@/lib/domain/types";
import type { CodingAgent, Deliverable, DeliverableKind, ProjectBrief, RoutingRule, RoutingStrategy } from "./types";

/* ═══════════════════════════ Catalogue des fondations ═══════════════════════════ */

export const DELIVERABLE_META: Record<DeliverableKind, { title: string; hint: string; order: number }> = {
  prd: { title: "PRD", hint: "Vision, objectifs, fonctionnalités", order: 1 },
  personas: { title: "Personas", hint: "Pour qui, quels besoins", order: 2 },
  user_flows: { title: "Parcours utilisateurs", hint: "Les chemins clés, étape par étape", order: 3 },
  wireframes: { title: "Wireframes", hint: "Maquettes UI/UX", order: 4 },
  data_model: { title: "Modèle de données", hint: "Schéma et relations", order: 5 },
  architecture: { title: "Architecture", hint: "Stack, services, infra", order: 6 },
  edge_cases: { title: "Cas limites", hint: "Scénarios et risques", order: 7 },
  acceptance: { title: "Critères d'acceptation", hint: "Tests et validation", order: 8 },
  brand: { title: "Identité de marque", hint: "Nom, ton, couleurs", order: 9 },
  go_to_market: { title: "Plan de lancement", hint: "Cible, canaux, 30 premiers jours", order: 10 },
};

export const DELIVERABLE_KINDS = (Object.keys(DELIVERABLE_META) as DeliverableKind[]).sort((a, b) => DELIVERABLE_META[a].order - DELIVERABLE_META[b].order);

export const APP_TYPE_META: Record<ProjectBrief["appType"], { label: string; hint: string }> = {
  saas: { label: "SaaS", hint: "Abonnement, espace client, tableau de bord" },
  marketplace: { label: "Place de marché", hint: "Offre, demande, commissions" },
  booking: { label: "Réservation", hint: "Créneaux, paiement, confirmations" },
  portal: { label: "Portail client", hint: "Espace sécurisé et personnalisé" },
  internal: { label: "Outil interne", hint: "Back-office, automatisations" },
  mobile: { label: "Application mobile", hint: "iOS et Android" },
  content: { label: "Site et contenus", hint: "Landing, blog, SEO" },
};

/** Devine le type d'application à partir d'une description libre. */
export function guessAppType(text: string): ProjectBrief["appType"] {
  const t = text.toLowerCase();
  if (/réserv|creneau|créneau|rendez-vous|booking|hôtel|hotel|restaurant/.test(t)) return "booking";
  if (/marketplace|place de marché|mettre en relation|vendeurs|annonces/.test(t)) return "marketplace";
  if (/portail|espace client|extranet/.test(t)) return "portal";
  if (/interne|back-?office|équipe|collaborateurs|automatis/.test(t)) return "internal";
  if (/mobile|ios|android|appli/.test(t)) return "mobile";
  if (/blog|landing|site vitrine|contenu|newsletter/.test(t)) return "content";
  return "saas";
}

/** Extrait 3 à 5 fonctionnalités plausibles d'une description libre. */
export function suggestFeatures(text: string, appType: ProjectBrief["appType"]): string[] {
  const base: Record<ProjectBrief["appType"], string[]> = {
    booking: ["Recherche et disponibilités", "Réservation en ligne", "Paiement sécurisé", "Emails de confirmation", "Espace d'administration"],
    marketplace: ["Profils vendeurs", "Catalogue et recherche", "Messagerie", "Paiement et commission", "Avis et notes"],
    portal: ["Connexion sécurisée", "Tableau de bord personnalisé", "Documents partagés", "Demandes et suivi", "Notifications"],
    internal: ["Tableau de bord d'équipe", "Formulaires métiers", "Automatisations", "Exports", "Gestion des droits"],
    mobile: ["Inscription rapide", "Écran d'accueil personnalisé", "Notifications push", "Mode hors ligne", "Profil"],
    content: ["Page d'accueil", "Blog et SEO", "Capture d'emails", "Formulaire de contact", "Statistiques"],
    saas: ["Inscription et comptes", "Tableau de bord", "Fonction cœur", "Abonnement et paiement", "Paramètres et équipe"],
  };
  const list = base[appType];
  const t = text.toLowerCase();
  const extras: string[] = [];
  if (/paiement|payer|stripe/.test(t) && !list.some((l) => /paiement/i.test(l))) extras.push("Paiement en ligne");
  if (/admin/.test(t) && !list.some((l) => /admin/i.test(l))) extras.push("Espace d'administration");
  return [...extras, ...list].slice(0, 5);
}

/* ═══════════════════════════ Génération du contenu ═══════════════════════════ */

function ctx(project: Pick<Project, "name" | "description" | "context">, brief?: ProjectBrief | null) {
  const pitch = brief?.pitch || project.description || `${project.name}, un produit numérique.`;
  const audience = brief?.audience || "Entrepreneurs et petites équipes";
  const problem = brief?.problem || "Le problème principal n'est pas encore formulé : à préciser au cadrage.";
  const features = brief?.features?.length ? brief.features : ["Inscription et comptes", "Fonction cœur", "Tableau de bord", "Paiement"];
  const constraints = brief?.constraints || project.context || "Lancer vite, garder la maîtrise des coûts.";
  return { name: project.name, pitch, audience, problem, features, constraints, appType: brief?.appType ?? "saas" };
}

function contentFor(kind: DeliverableKind, c: ReturnType<typeof ctx>): { content: string; summary: string; format: "markdown" | "html" } {
  const f = c.features;
  switch (kind) {
    case "prd":
      return {
        summary: `${f.length} fonctionnalités prioritaires, objectifs mesurables, périmètre de la v1.`,
        format: "markdown",
        content: `# PRD — ${c.name}

> ${c.pitch}

## Problème
${c.problem}

## Pour qui
${c.audience}

## Objectifs de la v1 (30 jours)
| Objectif | Indicateur | Cible |
|---|---|---|
| Prouver l'usage | Utilisateurs actifs hebdomadaires | 50 |
| Prouver la valeur | Taux d'activation | 40 % |
| Prouver le modèle | Premiers clients payants | 5 |

## Fonctionnalités
${f.map((x, i) => `${i + 1}. **${x}** — ${i < 3 ? "indispensable (v1)" : "souhaitable (v1.1)"}`).join("\n")}

## Hors périmètre v1
- Application mobile native
- Multi-langue
- Intégrations tierces avancées

## Contraintes
${c.constraints}

## Risques principaux
- Adoption : la valeur doit être visible dès la première session.
- Confiance : paiement et données personnelles irréprochables.
`,
      };
    case "personas":
      return {
        summary: "2 personas principaux, leurs objectifs, freins et moments clés.",
        format: "markdown",
        content: `# Personas — ${c.name}

## 1. La décideuse pressée
- **Qui** : ${c.audience}
- **Objectif** : obtenir un résultat en moins de 5 minutes
- **Frein** : n'a pas le temps d'apprendre un nouvel outil
- **Déclencheur** : un besoin urgent, souvent le lundi matin

## 2. L'utilisateur régulier
- **Objectif** : gagner du temps chaque semaine
- **Frein** : a déjà essayé des outils trop complexes
- **Ce qui le fera rester** : la fiabilité et les rappels au bon moment

## Ce que nos personas ont en commun
Ils jugent le produit sur sa **première minute**. Tout ce qui ralentit l'accès à la valeur est un risque.
`,
      };
    case "user_flows":
      return {
        summary: "Les 3 parcours critiques, de l'arrivée à la valeur.",
        format: "markdown",
        content: `# Parcours utilisateurs — ${c.name}

## Parcours 1 — Première visite → première valeur
1. Arrive sur la page d'accueil (promesse en une phrase)
2. Clique sur l'appel à l'action principal
3. Crée son compte (email ou Google, 20 secondes)
4. Utilise **${f[0] ?? "la fonction cœur"}** guidé pas à pas
5. Voit le résultat et reçoit un email récapitulatif

## Parcours 2 — Retour et habitude
1. Reçoit un rappel utile
2. Retrouve son tableau de bord
3. Utilise **${f[1] ?? "la seconde fonctionnalité"}**

## Parcours 3 — Passage au payant
1. Atteint la limite de l'offre gratuite
2. Compare les formules
3. Paie en un clic, accès immédiat
`,
      };
    case "wireframes":
      return {
        summary: "Accueil, tableau de bord et écran cœur, en maquette HTML.",
        format: "html",
        content: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wireframes — ${c.name}</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f5f4f0;color:#0b0b0c}.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;padding:28px}.frame{background:#fff;border:1.5px solid #0b0b0c;border-radius:10px;padding:16px;min-height:360px;display:flex;flex-direction:column;gap:10px}.t{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#85827a}.box{background:#eeece6;border-radius:6px}.btn{background:#0b0b0c;color:#fff;border-radius:6px;padding:9px 12px;font-size:13px;font-weight:700;align-self:flex-start}.acc{background:#ff5a1f}.h{height:18px;width:70%}.p{height:10px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}</style></head>
<body><div class="row">
<div class="frame"><div class="t">01 · Accueil</div><div class="box h"></div><div class="box p" style="width:90%"></div><div class="box p" style="width:60%"></div><div class="btn acc">Commencer</div><div class="box" style="height:140px;margin-top:auto"></div></div>
<div class="frame"><div class="t">02 · Tableau de bord</div><div class="grid"><div class="box" style="height:60px"></div><div class="box" style="height:60px"></div><div class="box" style="height:60px"></div><div class="box" style="height:60px"></div></div><div class="box" style="height:120px"></div><div class="box p"></div><div class="box p" style="width:70%"></div></div>
<div class="frame"><div class="t">03 · ${f[0] ?? "Écran cœur"}</div><div class="box h" style="width:50%"></div>${f
          .slice(0, 4)
          .map((x) => `<div style="display:flex;gap:8px;align-items:center"><div class="box" style="width:18px;height:18px"></div><div style="font-size:13px">${x}</div></div>`)
          .join("")}<div class="btn" style="margin-top:auto">Valider</div></div>
</div></body></html>`,
      };
    case "data_model":
      return {
        summary: "Entités, champs clés et relations, prêt pour la base de données.",
        format: "markdown",
        content: `# Modèle de données — ${c.name}

| Entité | Champs clés | Relations |
|---|---|---|
| **User** | id, email, name, role, created_at | 1 — n Subscription, 1 — n Item |
| **Organization** | id, name, plan | 1 — n User |
| **Item** | id, owner_id, title, status, data (jsonb) | n — 1 User |
| **Subscription** | id, user_id, plan, status, renews_at | n — 1 User |
| **Payment** | id, subscription_id, amount, currency, status | n — 1 Subscription |
| **Event** | id, user_id, type, payload, at | n — 1 User (analytics) |

\`\`\`sql
create table items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete cascade,
  title text not null,
  status text not null default 'draft',
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
\`\`\`

## Règles
- Suppression d'un utilisateur : anonymisation des paiements (obligation comptable).
- Toutes les tables ont une politique d'accès par propriétaire (Row Level Security).
`,
      };
    case "architecture":
      return {
        summary: "Stack recommandée, services, hébergement et coûts de départ.",
        format: "markdown",
        content: `# Architecture — ${c.name}

## Stack recommandée
| Couche | Choix | Pourquoi |
|---|---|---|
| Interface | Next.js + Tailwind | Rapide à construire, bien connu des agents de code |
| Base de données & auth | Supabase (Postgres) | Auth, stockage et règles d'accès inclus |
| Paiement | Stripe | Standard, Apple Pay / Google Pay |
| Emails | Resend | Simple, fiable |
| Hébergement | Vercel | Préprod automatique à chaque branche |
| Surveillance | Sentry + audits BuildOS | Erreurs et performances suivies |

## Environnements
\`dev\` (branches des agents) → \`revue humaine\` → \`préprod\` (lien partageable) → \`production\`

## Coûts de départ estimés
Moins de **25 € / mois** jusqu'à 1 000 utilisateurs.
`,
      };
    case "edge_cases":
      return {
        summary: "8 scénarios à risque et la réponse prévue pour chacun.",
        format: "markdown",
        content: `# Cas limites — ${c.name}

| Scénario | Risque | Réponse prévue |
|---|---|---|
| Double clic sur « Payer » | Double débit | Clé d'idempotence côté paiement |
| Réseau coupé pendant l'envoi | Perte de saisie | Brouillon enregistré localement |
| Email déjà utilisé | Blocage | Proposer la connexion, pas une erreur |
| Deux utilisateurs modifient la même donnée | Écrasement | Dernière écriture + historique |
| Paiement refusé | Frustration | Message clair + autre moyen de paiement |
| Fuseau horaire différent | Mauvaise date | Stockage UTC, affichage local |
| Compte supprimé | Données orphelines | Anonymisation automatique |
| Pic de trafic | Lenteur | Mise en cache + file d'attente |
`,
      };
    case "acceptance":
      return {
        summary: "Critères vérifiables par fonctionnalité, prêts pour les tests.",
        format: "markdown",
        content: `# Critères d'acceptation — ${c.name}

${f
  .map(
    (x) => `## ${x}
- [ ] Le parcours nominal fonctionne sur mobile et ordinateur
- [ ] Les erreurs sont expliquées en français, avec une solution
- [ ] L'action est enregistrée dans les statistiques
- [ ] Temps de réponse inférieur à 500 ms`,
  )
  .join("\n\n")}
`,
      };
    case "brand":
      return {
        summary: "Promesse, ton de voix, palette et typographies proposées.",
        format: "markdown",
        content: `# Identité — ${c.name}

**Promesse** : ${c.pitch}

**Ton** : direct, chaleureux, sans jargon. On parle résultats, pas fonctionnalités.

| Rôle | Couleur |
|---|---|
| Encre | #0B0B0C |
| Fond | #F5F4F0 |
| Action | #FF5A1F |
| Accent | #D4FF3A |

**Typographies** : une grotesque grasse pour les titres, une sans-serif lisible pour le texte.
`,
      };
    case "go_to_market":
      return {
        summary: "Cible prioritaire, 3 canaux, plan des 30 premiers jours.",
        format: "markdown",
        content: `# Plan de lancement — ${c.name}

## Cible prioritaire
${c.audience}

## Canaux
1. **Réseau direct** : 50 messages personnalisés (semaine 1)
2. **Communauté** : présentation au Build Club + retours du Lab Growth
3. **Contenu** : 2 posts LinkedIn par semaine, un cas client par mois

## 30 premiers jours
| Semaine | Objectif | Indicateur |
|---|---|---|
| 1 | 20 premiers utilisateurs | Inscriptions |
| 2 | 10 entretiens utilisateurs | Retours qualitatifs |
| 3 | Itération sur la fonction cœur | Activation |
| 4 | 5 clients payants | Revenu |
`,
      };
  }
}

export function generateDeliverable(kind: DeliverableKind, project: Pick<Project, "id" | "name" | "description" | "context">, brief?: ProjectBrief | null, version = 1): Deliverable {
  const c = ctx(project, brief);
  const { content, summary, format } = contentFor(kind, c);
  return {
    id: `${project.id}-${kind}`,
    projectId: project.id,
    kind,
    title: DELIVERABLE_META[kind].title,
    summary,
    status: "to_review",
    version,
    updatedAt: new Date().toISOString(),
    content,
    format,
  };
}

export function generateFoundations(project: Pick<Project, "id" | "name" | "description" | "context">, brief?: ProjectBrief | null): Deliverable[] {
  return DELIVERABLE_KINDS.map((k) => generateDeliverable(k, project, brief));
}

/** Tâches initiales proposées à partir du brief (backlog de départ). */
export function initialTasksFromBrief(brief: ProjectBrief): { title: string; spec: string; type: Task["type"]; priority: Task["priority"] }[] {
  const tasks: { title: string; spec: string; type: Task["type"]; priority: Task["priority"] }[] = brief.features.slice(0, 4).map((f, i) => ({
    title: f,
    spec: `Implémenter « ${f} » pour ${brief.audience.toLowerCase()}.\n\nContexte : ${brief.pitch}\n\nCritères : parcours nominal sur mobile et ordinateur, erreurs expliquées, temps de réponse < 500 ms.`,
    type: "code",
    priority: i === 0 ? "high" : "medium",
  }));
  tasks.push({
    title: "Page d'accueil et promesse",
    spec: `Page d'accueil : promesse en une phrase (« ${brief.pitch} »), 3 bénéfices, appel à l'action principal, preuve sociale.`,
    type: "marketing",
    priority: "high",
  });
  tasks.push({
    title: "Étude rapide de la concurrence",
    spec: `Comparer 5 alternatives utilisées par ${brief.audience.toLowerCase()} : prix, promesse, points faibles. Conclure par notre angle différenciant.`,
    type: "research",
    priority: "medium",
  });
  return tasks;
}

/* ═══════════════════════════ Routage des agents ═══════════════════════════ */

/** Choisit l'agent de code pour une tâche selon les règles, la disponibilité et la stratégie. */
export function routeAgent(task: Pick<Task, "type" | "priority">, agents: CodingAgent[], rules: RoutingRule[], strategy: RoutingStrategy = "balanced"): CodingAgent | null {
  const usable = agents.filter((a) => a.enabled && a.connected && a.status !== "offline" && a.status !== "quota");
  if (!usable.length) return null;
  for (const r of rules) {
    const typeOk = !r.when.types?.length || r.when.types.includes(task.type);
    const prioOk = !r.when.priorities?.length || r.when.priorities.includes(task.priority);
    if (typeOk && prioOk) {
      const a = usable.find((x) => x.id === r.agentId);
      if (a) return a;
    }
  }
  const fit = usable.filter((a) => a.bestFor.includes(task.type));
  const pool = fit.length ? fit : usable;
  const score = (a: CodingAgent) =>
    strategy === "quality" ? a.successRate * 10 - a.costPerTask * 0.2 : strategy === "economy" ? -a.costPerTask * 4 + a.successRate * 2 : a.successRate * 6 - a.costPerTask - a.avgMinutes * 0.05;
  return [...pool].sort((x, y) => score(y) - score(x))[0] ?? null;
}

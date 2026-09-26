# BuildOS — guide du projet

**BuildOS** (anciennement « Atelier ») — « De l'idée à la production » — est le système d'exploitation des entrepreneurs pour créer et faire évoluer des applications avec l'IA. Il intègre la brique communautaire **Build Club** (buildclub.tech : ateliers, labs, experts, communauté) et le format intensif **StartupWeek** (7 jours pour lancer un MVP). Cœur du produit : un tableau de tâches où un fondateur écrit une spécification et où **l'IA prend la main immédiatement** : cadrage, plan, fabrication, contrôle, puis **validation humaine (HITL)** et intégration (dépôt git ou dossier de livrables). Public : participants de startupweek.tech (bootcamp MVP de 7 jours). Interface **en français**.

Le dépôt contient trois couches :

- **Prototype front** — règles du pipeline et IA simulée côté client (`src/lib/client/fake/*`). Utilisé tel quel pour la démo (`/demo`) et quand Supabase n'est pas configuré. On valide l'usage, pas la technique.
- **Comptes & back-office Supabase (mode par défaut dès que Supabase est configuré)** — authentification, équipes, persistance de toutes les données, temps réel, administration (`src/lib/supabase/*`, `src/lib/client/supabase/*`, `supabase/migrations/*`, `/admin`). L'IA reste simulée (voir « Supabase » plus bas).
- **Moteur réel (en veille)** — `src/lib/server/*`, `src/app/api/*`, SQLite + Claude Agent SDK. Ne pas le supprimer, ne pas s'en servir, ne pas le casser (`pnpm typecheck` doit rester vert).

## Commandes

- `pnpm typecheck` — obligatoire avant de rendre la main (zéro erreur).
- Le serveur de dev tourne déjà sur http://localhost:3000 (ne pas en lancer un autre). `pnpm build` n'est pas requis.
- Ne pas ajouter de dépendance (exception validée : `@supabase/supabase-js` et `@supabase/ssr`). Disponibles : `react 19`, `next 16`, `tailwindcss 4`, `radix-ui` (paquet unifié : `import { Dialog, Popover, ... } from "radix-ui"`), `@dnd-kit/core|sortable|utilities|modifiers`, `motion` (`import { motion, AnimatePresence } from "motion/react"`), `lucide-react`, `cmdk`, `sonner`, `react-markdown` + `remark-gfm`, `parse-diff`, `date-fns` (locale `fr`), `zustand`, `zod`, `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid`.

## Architecture (front)

```
src/lib/domain/          types métier partagés (Task, Project, Stage…), STAGES/STAGE_META, helpers
src/lib/client/store.ts  store zustand : état, actions, sélecteurs (useStore, useProjectTasks…)
src/lib/client/datasource.ts  interface DataSource ; implémentations fake/ (défaut) et api-source.ts
src/lib/client/fake/     db.ts (mémoire+localStorage), simulator.ts (IA simulée), content.ts (contenus), seed.ts (jeu de données)
src/lib/client/utils.ts  cn(), timeAgo(), humanDay(), shortTime(), daysUntil(), uid(), modKey()
src/components/ui/       primitives : button, chip, dialog (DialogContent, SheetContent…), dropdown, input (Input, Textarea, Select, Field, Switch, Segmented), tooltip, misc (Kbd, Spinner, WorkingDots, Skeleton, EmptyState, SectionTitle, Divider, Progress)
src/components/shared/task-bits.tsx  TypeIcon, TypeChip, PriorityMark, StatusBadge, StatusIcon, statusTone, StagePill, stageTone, ProgressRail, DueChip, CostChip, ActivityLine
src/components/shell/    AppShell, Sidebar, TopBar, Brand, theme, shortcuts
src/components/views/    board/ flow/ list/ week/ dashboard/   (une vue = un dossier)
src/components/task/     TaskDrawer (panneau de détail)
src/components/composer/ NewTaskDialog ; src/components/palette/ CommandPalette
src/components/project/  ProjectDialog ; src/components/settings/ SettingsView ; src/components/onboarding/ Onboarding
src/lib/buildos/         socle BuildOS (voir plus bas)
```

### Pipeline (source de vérité : `src/lib/domain/stages.ts`)

`backlog` (À faire, humain) → `clarify` (Cadrage, IA) → `plan` (Plan, IA) → `build` (Fabrication, IA) → `verify` (Contrôle, IA) → `review` (À valider, **HITL**) → `integrate` (Intégration, IA) → `done` (Terminé).

Statuts (`task.status`) : `idle`, `queued`, `running`, `waiting_input` (l'IA a posé une question — `task.refinedSpec.questions`, réponses via action `answer`), `waiting_review` (plan à valider si `stage === "plan"`, sinon résultat), `failed` (`task.error`), `done`, `cancelled`. `needsHuman(task)` = waiting_input | waiting_review | failed.

Autonomie : `effectiveAutonomy(task, project)` ∈ `autopilot` | `plan_gate` | `manual`.

### Store (`useStore`)

État : `projects`, `projectId`, `tasks` (Record), `events[taskId]`, `artifacts[taskId]`, `settings`, `ai`, `selectedTaskId`, `drawerTab`, `composerOpen`, `composerDraft`, `paletteOpen`, `projectDialog`, `filters`, `sidebarCollapsed`.

Actions : `selectTask(id, tab?)`, `setDrawerTab`, `openComposer(draft?)`, `closeComposer`, `togglePalette(open?)`, `openProjectDialog(id?)`, `closeProjectDialog`, `setFilters`, `clearFilters`, `setProject`, `createTask(input)`, `updateTask(id, patch)`, `deleteTask(id)`, `act(id, action)` (retourne `null` et toaste en cas d'erreur), `loadTaskDetail(id)`, `loadArtifact(taskId, artifactId)`, `createProject`, `updateProject`, `deleteProject`, `updateSettings`, `testAI`, `seedDemo`, `resetAll`.

Actions sur tâche (`act`) : `start`, `pause`, `cancel`, `retry`, `answer {answers}`, `approve_plan {comment?}`, `approve {comment?}`, `request_changes {comment}`, `reject {comment?}`, `move {stage, position?}`, `skip_to_done`, `reopen`.

Sélecteurs : `useCurrentProject()`, `useProjectTasks()`, `useFilteredTasks()`, `useTasksByStage()`, `useSelectedTask()`, `useTaskEvents(id)`, `useTaskArtifacts(id)`, `useProjectLabels()`, `useAttentionCount()`.

Les événements (`TaskEvent.kind`) : `stage`, `status`, `log`, `text` (l'IA parle), `thinking`, `tool_use` (`data.tool`, `data.input`), `tool_result` (`data.isError`), `question` (`data.questions`), `answer`, `review`, `feedback`, `integration`, `error`, `system`, `progress`.

Artefacts (`Artifact.kind`) : `diff` (contenu = diff unifié git), `file` (`title` = chemin relatif, `mime`, `content` texte), `commit`, `pr` (`url`), `folder` (`url`), `link`.

## Design system — BuildOS « build club éditorial »

Référence visuelle : maquette fournie par le fondateur (landing BuildOS). Blanc cassé + encre noire, typographie **très grasse et serrée**, une couleur d'action **orange**, un **surligneur lime** pour les annotations manuscrites façon post-it, un **bleu électrique** pour tout ce que fait l'IA. Visuels noir & blanc (trame demi-teinte), flèches et notes au feutre, pastilles de section numérotées orange (« 01 », « 02 »…). Clair par défaut ; le sombre est un choix explicite.

- Couleurs : uniquement via les tokens Tailwind `bg-paper`, `bg-paper-2`, `bg-paper-3`, `bg-card`, `bg-card-2`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-ink-4`, `border-line`, `border-line-2`, `border-line-3`, `accent` / `accent-ink` / `accent-soft` (orange), `ai` / `ai-ink` / `ai-soft` (bleu IA), `lime` / `lime-ink` / `lime-soft` (surligneur), `ok`, `warn`, `danger`, `violet` (+ `-soft`). Blanc autorisé en texte sur fond ink/accent (`text-white`, `text-paper`). **Jamais** de couleur Tailwind brute, jamais de dégradé violet.
- Typographie : `font-display` (Schibsted Grotesk, 800–900, `tracking-[-0.04em]` sur les grands titres, `leading-[0.95]`) pour titres et chiffres clés ; `font-sans` (Geist) pour le texte ; `font-mono` (Geist Mono) pour identifiants, métriques, étiquettes de section en capitales (`text-[11px] uppercase tracking-[0.14em]`) ; `font-hand` (Permanent Marker) **uniquement** pour les annotations manuscrites (post-its lime, notes fléchées), toujours courtes, en capitales, légèrement pivotées.
- Signatures (utilitaires de `globals.css`) : `sticky-lime` (post-it), `marker-underline` (soulignement feutre orange), `marker-highlight` (surlignage lime), `halftone` (trame de points, couleur = `currentColor`), `brutal` (bordure encre + ombre décalée), `section-badge` (pastille orange « 01 »), `animate-marquee`, `animate-float`, `caret`, plus `reveal` / `reveal-fast` (cascade via `style={{"--i": n}}`), `ai-stitch`, `pulse-ring`, `animate-blink`, `animate-breathe`.
- Boutons : `variant="ink"` (noir) = CTA principal (« Démarrer un projet »), `primary` (orange) = action forte / humaine (Valider), `lime` = action ludique, `secondary` = contour, `ai` = lancer l'IA. `Chip tone="lime"` disponible.
- Rayons : `rounded-md` (10 px) cartes/boutons, `rounded-xl`/`rounded-2xl` panneaux, `rounded-full` pastilles et toggles. Cartes blanches (`bg-card`) bordées `border-line` sur fond `bg-paper`.
- Sémantique : l'IA travaille → `ai` (bleu) + `WorkingDots`/`ai-stitch` ; attend le fondateur → `accent` (orange, `pulse-ring`) ; échec → `danger` ; terminé / disponible → `ok` (vert, comme les toggles « Disponible » de la maquette).
- Copie UI : français, vouvoiement, phrases courtes, verbes d'action. Ton Build Club : concret, énergique, un peu joueur (« Moins de friction, plus de création »).
- Motion : sobre ; une entrée en cascade soignée par écran, micro-interactions au survol. `prefers-reduced-motion` géré globalement.
- Accessibilité : `aria-label` sur icônes seules, focus visible, contrastes via tokens, cibles ≥ 28 px.
- Composants : réutiliser `src/components/ui/*`, `src/components/shared/*` et `src/components/shell/Brand.tsx` (`BrandMark`, `Wordmark` — monogramme « B/ »).

## Carte du produit BuildOS (routes)

| Route | Écran | Dossier |
|---|---|---|
| `/` | Landing marketing (publique, sans store) | `src/components/marketing/` |
| `/onboarding` | Onboarding immersif (plein cadre, crée le projet) | `src/components/onboarding/` |
| `/home` | Vue d'ensemble du fondateur | `src/components/home/` |
| `/board` `/flow` `/list` `/week` | Vues du projet (kanban…) | `src/components/views/` |
| `/deliverables` | Fondations générées (PRD, wireframes, modèle de données…) | `src/components/deliverables/` |
| `/agents` | Mes agents de code (Codex, Claude Code, Cursor, Copilot…) + routage | `src/components/agents/` |
| `/releases` | Mise en production : Dev → Revue humaine → Préprod → Production | `src/components/releases/` |
| `/dashboard` | Analytics du pipeline | `src/components/views/dashboard/` |
| `/audits` | Audits & santé de l'application | `src/components/audits/` |
| `/club` | Build Club : ateliers, labs, experts, communauté, StartupWeek | `src/components/club/` |
| `/settings` | Réglages (+ Compte et Équipe avec Supabase) | `src/components/settings/` |
| `/login` `/signup` `/forgot-password` `/reset-password` | Authentification e-mail + mot de passe | `src/components/auth/` |
| `/admin` `/admin/users` `/admin/projects` `/admin/ai` `/admin/club` `/admin/journal` | Administration (rôle `admin`) | `src/components/admin/` |

Routes de l'app dans `src/app/(app)/` (coquille `AppShell` ; `/onboarding` rendu sans barre latérale). Landing dans `src/app/(marketing)/`. Authentification dans `src/app/(auth)/` ; retours d'e-mail `src/app/auth/confirm/route.ts` ; démo `src/app/demo/` (pose le cookie `buildos_demo`) ; administration `src/app/admin/` (mise en page serveur qui vérifie le rôle). `src/proxy.ts` (ex-middleware, Next 16) rafraîchit la session et protège les routes.

### Socle BuildOS (`src/lib/buildos/`)

- `types.ts` : `CodingAgent`, `RoutingRule`, `Deliverable` (+ `DeliverableKind`), `Release` (+ `EnvId`), `HealthMetric`, `AuditReport`, `ProductMetric`, `ClubEvent`, `ClubLab`, `Expert`, `ClubPost`, `FounderProfile`, `JourneyStep`, `ProjectBrief`.
- `fixtures.ts` : agents par défaut, règles de routage, données Build Club, `releasesFor()`, `healthFor()`, `productMetricsFor()`, `auditsFor()`, `defaultJourney()` (parcours 7 jours façon StartupWeek).
- `generate.ts` : `DELIVERABLE_META`, `DELIVERABLE_KINDS`, `APP_TYPE_META`, `guessAppType()`, `suggestFeatures()`, `generateDeliverable()`, `generateFoundations()`, `initialTasksFromBrief()`, `routeAgent(task, agents, rules, strategy)`.
- `store.ts` : `useBuildOS` (zustand persisté `buildos.v1`) — `profile`, `agents`, `routing`, `strategy`, `briefs`, `deliverables[projectId]`, `releases[projectId]`, `audits[projectId]`, `journeys[projectId]`, `events`, `labs`, `posts`, `experts`, `assistantOpen` ; actions `setProfile`, `completeOnboarding`, `ensureProject(project)` (**à appeler** avant de lire les données d'un projet), `setBrief`, `toggleAgent`, `connectAgent`, `setStrategy`, `setRouting`, `generateFoundations(project, {stagger})`, `regenerateDeliverable`, `validateDeliverable`, `updateDeliverableContent`, `approveRelease`, `promoteRelease`, `rollbackRelease`, `markFindingConverted`, `runAudit`, `toggleJourneyStep`, `registerEvent`, `joinLab`, `likePost`, `addPost`, `joinClub`, `setAssistantOpen`, `resetBuildOS`.
- Tâches, projets et pipeline IA restent dans `@/lib/client/store` (`useStore`). Créer une tâche depuis une nouvelle brique : `useStore.getState().createTask({...})`.

## Supabase (comptes, équipes, données, admin)

Projet Supabase `buildos` (réf. `jgzgavogcaktigpzmsda`, région Paris). Variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clé publique, sans danger côté navigateur). Aucune clé `service_role` n'est utilisée par l'application.

**Choix de la source** (`getDataSource()`) : `NEXT_PUBLIC_ATELIER_MODE=api` → moteur réel ; sinon Supabase configuré et pas de cookie démo → `SupabaseDataSource` ; sinon `FakeDataSource`.

**Principe** : `SupabaseDataSource` hérite de `FakeDataSource` (mêmes règles d'actions, même simulateur) avec une base `SupabaseDb` (hérite de `FakeDb`) dont chaque écriture part dans une file ordonnée (`SyncQueue` : fusion des patchs, lots d'insertions). Les changements des autres (coéquipiers, admin) arrivent par Supabase Realtime (`tasks`, `task_events`, `projects`, `project_members`). Une tâche en cours n'est simulée que par **un seul onglet** : bail `tasks.sim_owner` / `sim_heartbeat` (RPC `claim_task_lease`, `renew_task_leases`), repris si périmé (25 s).
Le store BuildOS (`useBuildOS`) est inchangé : `buildos-sync.ts` l'hydrate depuis la base puis écrit chaque différence (comparaison par identité d'objet : **garder les actions du store immuables**).

**Fichiers** : `src/lib/supabase/` (`config.ts`, `client.ts` navigateur, `server.ts` serveur, `database.types.ts` à régénérer après migration) ; `src/lib/client/supabase/` (`source.ts`, `db.ts`, `sync-queue.ts`, `mappers.ts`, `buildos-sync.ts`, `session.ts` → `useSession`, `useProjectRole`, `useIsAdmin`, `plans.ts`).

**Schéma** (`supabase/migrations/`, appliquées dans l'ordre) : `profiles` (1 par compte, créé par trigger ; `app_role` founder|admin, `plan`, `ai_quota_usd` (0 = illimité), `suspended_at`), `projects` (+ `owner_id`), `project_members` (owner|member|viewer), `project_invitations`, `tasks`, `task_events` (id = ms×1000+n généré côté client), `artifacts`, `user_preferences`, `project_briefs`, `deliverables`, `releases`, `audit_reports`, `journey_steps`, `ai_usage` (registre alimenté par trigger quand `tasks.cost_usd` augmente, imputé au propriétaire du projet), Build Club (`club_events` + `club_event_registrations`, `club_labs` + `club_lab_members`, `experts` + `expert_bookings`, `club_posts` + `club_post_likes` ; compteurs maintenus par triggers), `admin_audit_log`.

**Sécurité** : RLS sur toutes les tables. Fonctions d'aide dans le schéma `private` (non exposé) : `is_admin()`, `is_active_user()`, `project_role(pid)`, `is_project_member`, `can_edit_project` (owner/member), `is_project_owner`. Un compte suspendu ne voit plus aucun projet. Colonnes sensibles de `profiles` (`app_role`, `plan`, quota, suspension) modifiables **uniquement** via les RPC admin (`admin_set_role`, `admin_set_suspended`, `admin_set_quota`, `admin_cancel_task`, `admin_moderate_post`, `admin_set_booking_status`, lectures `admin_overview`, `admin_list_users`, `admin_list_projects`, `admin_cost_by_day`, `admin_event_registrations`, `admin_list_bookings`) qui vérifient le rôle et écrivent au journal. Nouvelle table = RLS + politiques + `revoke all … from anon` dans la même migration, puis conseillers Supabase (sécurité et performance).

**Conventions** : toute évolution du schéma = nouveau fichier `supabase/migrations/AAAAMMJJHHMMSS_nom.sql` (appliqué au projet) + mise à jour de `database.types.ts` + mappers. Les composants lisent la session via `useSession` ; le mode compte se teste avec `useSession((s) => s.mode === "cloud")` ou `useStore((s) => s.mode === "supabase")`.

## Conventions de code

- TypeScript strict, composants fonctionnels, `"use client"` en tête de chaque composant interactif.
- Imports absolus `@/…`. Un composant par fichier, nommé en PascalCase ; helpers en camelCase.
- Pas de `any`. Utiliser les types du domaine (`Task`, `Project`, `Stage`, `TaskEvent`, `Artifact`).
- Les mutations passent **toujours** par le store (`useStore.getState().act(...)` ou hooks), jamais par la source directement.
- Formats : `formatCost`, `formatDuration`, `formatTokens`, `stageDurationMs`, `timeInCurrentStageMs` (`@/lib/domain/helpers`), `timeAgo`, `humanDay`, `shortTime` (`@/lib/client/utils`).
- Aucune chaîne anglaise dans l'UI (sauf noms de fichiers, commandes, identifiants).
- Ne pas modifier les fichiers hors de son périmètre sans raison ; si un fichier partagé (`store.ts`, `task-bits.tsx`, `ui/*`, `globals.css`) doit changer, faire un changement **additif** minimal et le signaler dans le compte rendu.

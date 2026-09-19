# Atelier — guide du projet

Atelier est un tableau de tâches où un fondateur écrit une spécification et où **l'IA prend la main immédiatement** : cadrage, plan, fabrication, contrôle, puis **validation humaine (HITL)** et intégration (dépôt git ou dossier de livrables). Public : participants de startupweek.tech (bootcamp MVP de 7 jours). Interface **en français**.

Le dépôt contient deux couches :

- **Prototype front (mode par défaut)** — données simulées côté client, IA simulée par `src/lib/client/fake/*`. C'est ce qu'on construit et teste maintenant : valider l'usage, pas la technique.
- **Back-office réel (en veille)** — `src/lib/server/*`, `src/app/api/*`, SQLite + Claude Agent SDK. Ne pas le supprimer, ne pas s'en servir, ne pas le casser (`pnpm typecheck` doit rester vert).

## Commandes

- `pnpm typecheck` — obligatoire avant de rendre la main (zéro erreur).
- Le serveur de dev tourne déjà sur http://localhost:3000 (ne pas en lancer un autre). `pnpm build` n'est pas requis.
- Ne pas ajouter de dépendance. Disponibles : `react 19`, `next 16`, `tailwindcss 4`, `radix-ui` (paquet unifié : `import { Dialog, Popover, ... } from "radix-ui"`), `@dnd-kit/core|sortable|utilities|modifiers`, `motion` (`import { motion, AnimatePresence } from "motion/react"`), `lucide-react`, `cmdk`, `sonner`, `react-markdown` + `remark-gfm`, `parse-diff`, `date-fns` (locale `fr`), `zustand`, `zod`, `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid`.

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
src/components/project/  ProjectDialog ; src/components/settings/ SettingsView ; src/components/onboarding/ Welcome
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

## Design system — « l'atelier éditorial »

Papier chaud + encre, **une seule couleur d'action** (terracotta `accent`) réservée aux actions humaines et aux tâches qui attendent le fondateur, **une couleur pour l'IA** (vert profond `ai`) pour tout ce que l'IA fait. Tout le reste est neutre. Sombre et clair, même chaleur.

- Couleurs : uniquement via les tokens Tailwind `bg-paper`, `bg-paper-2`, `bg-paper-3`, `bg-card`, `bg-card-2`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-ink-4`, `border-line`, `border-line-2`, `border-line-3`, `accent` / `accent-ink` / `accent-soft`, `ai` / `ai-ink` / `ai-soft`, `ok` / `ok-soft`, `warn` / `warn-soft`, `danger` / `danger-soft`, `violet` / `violet-soft`. **Jamais** de couleur Tailwind brute (`bg-gray-100`, `text-blue-500`…), jamais de dégradé violet.
- Typographie : `font-display` (Bricolage Grotesque) pour titres, en-têtes de colonnes, chiffres clés ; `font-sans` (Instrument Sans) pour le texte ; `font-mono` (JetBrains Mono) pour identifiants, commandes, journaux d'outils, coûts, durées, compteurs (`num`). Tailles : 11–13 px pour le dense, 14 px texte, 20 px titres de vue.
- Rayons : `rounded-md` (10 px) cartes et boutons, `rounded-lg`/`rounded-xl` panneaux, `rounded-full` pastilles. Ombres : `shadow-card`, `shadow-lift` (survol), `shadow-pop` (menus), `shadow-drawer`.
- Motion : entrées en cascade `className="reveal" style={{ "--i": index }}`, `reveal-fast`, indicateur IA `ai-stitch` (couture qui avance), `animate-blink`, `animate-breathe`, `pulse-ring` (attention HITL). `motion/react` pour les layout animations (cartes qui changent de colonne). Une seule animation soignée vaut mieux que dix micro-interactions. Respecter `prefers-reduced-motion` (déjà géré globalement).
- Sémantique visuelle : l'IA travaille → `ai` + `WorkingDots`/`ai-stitch` ; attend le fondateur → `accent` (`pulse-ring` sur la carte) ; échec → `danger` ; terminé → `ok`. Les colonnes/étapes IA sont teintées `ai` très légèrement, la colonne « À valider » `accent`.
- Copie UI : français, tutoiement exclu, vouvoiement, phrases courtes, verbes d'action (« Valider », « Demander des retouches », « Confier à l'IA »). Pas de jargon technique dans les libellés destinés aux fondateurs (le mode « Activité » peut montrer les outils bruts).
- Densité : produit de travail, pas landing page. Marges 12–20 px, cartes compactes, texte tronqué avec `truncate` + `title=`.
- Accessibilité : boutons avec `aria-label` quand icône seule, focus visible (déjà global), rôles ARIA sur listes/onglets, cibles ≥ 28 px, contrastes via tokens.
- Composants : réutiliser `src/components/ui/*` et `src/components/shared/task-bits.tsx` avant d'écrire du nouveau. Les nouveaux composants partagés par plusieurs vues vont dans `src/components/shared/`.

## Conventions de code

- TypeScript strict, composants fonctionnels, `"use client"` en tête de chaque composant interactif.
- Imports absolus `@/…`. Un composant par fichier, nommé en PascalCase ; helpers en camelCase.
- Pas de `any`. Utiliser les types du domaine (`Task`, `Project`, `Stage`, `TaskEvent`, `Artifact`).
- Les mutations passent **toujours** par le store (`useStore.getState().act(...)` ou hooks), jamais par la source directement.
- Formats : `formatCost`, `formatDuration`, `formatTokens`, `stageDurationMs`, `timeInCurrentStageMs` (`@/lib/domain/helpers`), `timeAgo`, `humanDay`, `shortTime` (`@/lib/client/utils`).
- Aucune chaîne anglaise dans l'UI (sauf noms de fichiers, commandes, identifiants).
- Ne pas modifier les fichiers hors de son périmètre sans raison ; si un fichier partagé (`store.ts`, `task-bits.tsx`, `ui/*`, `globals.css`) doit changer, faire un changement **additif** minimal et le signaler dans le compte rendu.

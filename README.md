# BuildOS

**De l'idée à la production.** Le système d'exploitation des entrepreneurs pour créer et faire évoluer des applications avec l'IA.

Vous décrivez ce que vous voulez. L'IA structure, pose les bonnes questions, génère les fondations (PRD, wireframes, modèle de données, architecture…), confie le code aux meilleurs agents (Claude Code, Codex, Cursor, Copilot…) et vous accompagne jusqu'à la production, avec une revue humaine à chaque étape clé et des audits réguliers.

BuildOS intègre le **Build Club** ([buildclub.tech](https://www.buildclub.tech) : ateliers, labs, experts, communauté) et le format intensif **StartupWeek** ([startupweek.tech](https://startupweek.tech) : 7 jours pour lancer un MVP).

## Les écrans

| Écran | Ce que l'entrepreneur y fait |
|---|---|
| **Landing** (`/`) | Découvre la promesse, essaie de décrire son idée, voit le produit en action, choisit un tarif |
| **Onboarding** (`/onboarding`) | En 3 minutes : profil, idée, questions de l'IA, brief, fondations générées en direct, agents, Build Club |
| **Vue d'ensemble** (`/home`) | Son cockpit : parcours de lancement en 7 jours, ce qui l'attend, ce que l'IA fait, santé de l'app |
| **Tableau, Flux, Liste, Semaine** | Les tâches du projet, prises en charge par l'IA et validées par lui |
| **Fondations** (`/deliverables`) | Relit, ajuste et valide les 10 livrables générés |
| **Mes agents** (`/agents`) | Connecte ses agents de code et règle le routage intelligent |
| **Mise en production** (`/releases`) | Dev → revue humaine → préprod → production, retour arrière possible |
| **Analytics, Audits** | Pilote le rythme, la santé et transforme chaque recommandation en tâche |
| **Build Club** (`/club`) | Ateliers, labs, experts à la demande, communauté, StartupWeek |
| **Assistant IA** (touche « . ») | Décrit un besoin en langage naturel, l'IA pose ses questions et crée les tâches |

## Le pipeline

| # | Étape | Qui | Ce qui se passe |
|---|---|---|---|
| 1 | **À faire** | vous | Vous écrivez la spécification (même en deux lignes). |
| 2 | **Cadrage** | IA | Relecture, critères d'acceptation, hypothèses, questions bloquantes uniquement. |
| 3 | **Plan** | IA | Étapes vérifiables, fichiers probables, risques, stratégie de vérification. |
| 4 | **Fabrication** | IA | Code sur une branche isolée, ou livrables (Markdown, HTML, CSV…). |
| 5 | **Contrôle** | IA | Tests, relecture, vérification de chaque critère ; boucle de correction automatique. |
| 6 | **À valider** | **vous** | Diff, aperçus, rapport de contrôle. Valider · Retouches · Refuser. |
| 7 | **Intégration** | IA | Fusion, pull request ou branche ; copie dans le dossier de livrables. |
| 8 | **Terminé** | — | Liens et artefacts conservés. |

Trois niveaux d'autonomie par projet ou par tâche : **Autopilote** (l'IA enchaîne jusqu'à la validation), **Plan validé** (elle s'arrête après le plan pour votre accord), **Manuel**.

## Vues

- **Tableau** — kanban, une colonne par étape, glisser-déposer, actions rapides sur les cartes.
- **Flux** — une ligne par tâche, la progression étape par étape avec les durées.
- **Liste** — dense, triable, actions groupées.
- **Semaine** — les sept jours du sprint, échéances déplaçables.
- **Bord** — rythme de livraison, coûts IA, points d'attention.

Le **panneau de détail** d'une tâche regroupe la spécification et le cadrage, le plan, le journal d'activité de l'IA en direct, le résultat (diff, aperçus Markdown/HTML/CSV) et la validation.

## Démarrer

```bash
pnpm install
pnpm dev
```

Ouvrez http://localhost:3000 pour la landing. « Voir la démo » ouvre l'application avec deux projets et une vingtaine de tâches à toutes les étapes, et une IA simulée qui fait vivre le pipeline en temps réel. « Démarrer un projet » lance l'onboarding. Aucun appel réel, aucune donnée ne quitte votre navigateur.

## Deux modes

### Prototype (par défaut)

Tout tourne dans le navigateur : données en mémoire + `localStorage`, IA simulée (`src/lib/client/fake/`). C'est le mode utilisé pour **valider l'usage** avec des fondateurs avant d'investir dans la technique. Les contenus produits (diffs, rapports, emails, maquettes) sont réalistes mais générés localement.

### Back-office réel (en veille)

Le dépôt contient aussi l'implémentation complète côté serveur : base SQLite (Drizzle + libsql), exécuteur de pipeline, moteur **Claude Agent SDK** (le même moteur que Claude Code : lecture/écriture de fichiers, shell, web), espaces de travail git isolés (worktrees), intégration par fusion / pull request (`gh`) / dossier de livrables, flux temps réel (SSE).

Pour l'activer :

```bash
# .env.local
ATELIER_BACKEND=1
NEXT_PUBLIC_ATELIER_MODE=api
# puis l'une des trois connexions :
ANTHROPIC_API_KEY=sk-ant-…            # clé API
# ou CLAUDE_CODE_OAUTH_TOKEN=…         # `claude setup-token` (abonnement Pro/Max)
# ou rien : Atelier réutilise la session `claude` connectée sur la machine
```

Sans connexion disponible, le back-office bascule sur son moteur de démonstration. Voir `.env.example` pour les autres variables (modèle, effort, parallélisme).

## Architecture

```
src/lib/domain/        types, étapes, helpers (partagés front / back)
src/lib/client/        store zustand, source de données (fake | api), simulateur et jeu de données
src/components/        ui/ primitives · shared/ · shell/ · views/ · task/ · composer/ · palette/ · project/ · settings/ · onboarding/
src/lib/server/        back-office : base, exécuteur, moteur IA, intégrations (désactivé par défaut)
src/app/api/           routes du back-office
```

Le guide de conception (identité BuildOS) et de contribution est dans `CLAUDE.md`.

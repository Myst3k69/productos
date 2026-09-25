"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Project } from "@/lib/domain/types";
import { CLUB_EVENTS, CLUB_LABS, CLUB_POSTS, DEFAULT_AGENTS, DEFAULT_ROUTING, EXPERTS, auditsFor, defaultJourney, releasesFor } from "./fixtures";
import { generateDeliverable, generateFoundations, DELIVERABLE_KINDS } from "./generate";
import type {
  AgentId,
  AuditReport,
  ClubEvent,
  ClubLab,
  ClubPost,
  CodingAgent,
  Deliverable,
  DeliverableKind,
  EnvId,
  FounderProfile,
  JourneyStep,
  ProjectBrief,
  Release,
  RoutingRule,
  RoutingStrategy,
} from "./types";

/**
 * Store des briques BuildOS (agents, fondations, mise en prod, audits, Build Club, profil, parcours).
 * Données simulées, persistées dans le navigateur. Les tâches restent dans `@/lib/client/store`.
 */
interface BuildOSState {
  profile: FounderProfile | null;
  agents: CodingAgent[];
  routing: RoutingRule[];
  strategy: RoutingStrategy;
  briefs: Record<string, ProjectBrief>;
  deliverables: Record<string, Deliverable[]>;
  releases: Record<string, Release[]>;
  audits: Record<string, AuditReport[]>;
  journeys: Record<string, JourneyStep[]>;
  events: ClubEvent[];
  labs: ClubLab[];
  posts: ClubPost[];
  experts: typeof EXPERTS;
  /** Panneau « Assistant IA » ouvert */
  assistantOpen: boolean;

  /* Profil & onboarding */
  setProfile(p: Partial<FounderProfile>): void;
  completeOnboarding(): void;

  /* Projets : initialise les données simulées d'un projet si besoin */
  ensureProject(project: Pick<Project, "id" | "name" | "description" | "context">): void;
  setBrief(brief: ProjectBrief): void;

  /* Agents */
  toggleAgent(id: AgentId, enabled: boolean): void;
  connectAgent(id: AgentId): Promise<void>;
  setStrategy(s: RoutingStrategy): void;
  setRouting(rules: RoutingRule[]): void;

  /* Fondations */
  generateFoundations(project: Pick<Project, "id" | "name" | "description" | "context">, opts?: { stagger?: boolean }): void;
  regenerateDeliverable(project: Pick<Project, "id" | "name" | "description" | "context">, kind: DeliverableKind, feedback?: string): void;
  validateDeliverable(projectId: string, kind: DeliverableKind): void;
  updateDeliverableContent(projectId: string, kind: DeliverableKind, content: string): void;

  /* Mise en production */
  approveRelease(projectId: string, releaseId: string): void;
  promoteRelease(projectId: string, releaseId: string, to: EnvId): void;
  rollbackRelease(projectId: string, releaseId: string): void;
  /** Prépare une release simulée : développement par l'agent, puis revue humaine. */
  createRelease(projectId: string, input: { title: string; items: string[] }): Release;

  /* Audits */
  markFindingConverted(projectId: string, auditId: string, findingId: string): void;
  runAudit(projectId: string): Promise<void>;

  /* Parcours */
  toggleJourneyStep(projectId: string, stepId: string, done?: boolean): void;

  /* Build Club */
  registerEvent(id: string, registered: boolean): void;
  joinLab(id: string, joined: boolean): void;
  likePost(id: string): void;
  addPost(post: Pick<ClubPost, "kind" | "content" | "project">): void;
  joinClub(): void;

  setAssistantOpen(open: boolean): void;
  resetBuildOS(): void;
}

const initial = () => ({
  profile: null as FounderProfile | null,
  agents: DEFAULT_AGENTS,
  routing: DEFAULT_ROUTING,
  strategy: "balanced" as RoutingStrategy,
  briefs: {} as Record<string, ProjectBrief>,
  deliverables: {} as Record<string, Deliverable[]>,
  releases: {} as Record<string, Release[]>,
  audits: {} as Record<string, AuditReport[]>,
  journeys: {} as Record<string, JourneyStep[]>,
  events: CLUB_EVENTS,
  labs: CLUB_LABS,
  posts: CLUB_POSTS,
  experts: EXPERTS,
  assistantOpen: false,
});

const ENV_ORDER: EnvId[] = ["dev", "review", "staging", "production"];

/** Version suivante (mineure) : v0.4.0 → v0.5.0. */
function nextVersion(versions: string[]): string {
  let best: [number, number] = [0, 0];
  for (const v of versions) {
    const m = /^v?(\d+)\.(\d+)/.exec(v);
    if (!m) continue;
    const cur: [number, number] = [Number(m[1]), Number(m[2])];
    if (cur[0] > best[0] || (cur[0] === best[0] && cur[1] > best[1])) best = cur;
  }
  return `v${best[0]}.${best[1] + 1}.0`;
}

export const useBuildOS = create<BuildOSState>()(
  persist(
    (set, get) => ({
      ...initial(),

      setProfile(p) {
        set((s) => ({
          profile: {
            name: "",
            role: "solo",
            techLevel: "some",
            stage: "idea",
            goal: "",
            hoursPerWeek: 10,
            onboarded: false,
            joinedClub: false,
            createdAt: new Date().toISOString(),
            ...(s.profile ?? {}),
            ...p,
          },
        }));
      },
      completeOnboarding() {
        get().setProfile({ onboarded: true });
      },

      ensureProject(project) {
        const s = get();
        const patch: Partial<BuildOSState> = {};
        if (!s.deliverables[project.id]) {
          // Projet existant sans onboarding : fondations déjà générées (démo), certaines validées.
          const list = generateFoundations(project, s.briefs[project.id]).map((d, i) => ({ ...d, status: i < 4 ? ("validated" as const) : i < 7 ? ("to_review" as const) : ("todo" as const) }));
          patch.deliverables = { ...s.deliverables, [project.id]: list };
        }
        if (!s.releases[project.id]) patch.releases = { ...s.releases, [project.id]: releasesFor(project.id, project.name) };
        if (!s.audits[project.id]) patch.audits = { ...s.audits, [project.id]: auditsFor(project.id) };
        if (!s.journeys[project.id]) {
          const j = defaultJourney().map((st, i) => ({ ...st, done: i < 3 }));
          patch.journeys = { ...s.journeys, [project.id]: j };
        }
        if (Object.keys(patch).length) set(patch);
      },
      setBrief(brief) {
        set((s) => ({ briefs: { ...s.briefs, [brief.projectId]: brief } }));
      },

      toggleAgent(id, enabled) {
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, enabled } : a)) }));
      },
      async connectAgent(id) {
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, status: "busy" } : a)) }));
        await new Promise((r) => setTimeout(r, 1400));
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, connected: true, enabled: true, status: "available" } : a)) }));
      },
      setStrategy(strategy) {
        set({ strategy });
      },
      setRouting(routing) {
        set({ routing });
      },

      generateFoundations(project, opts) {
        const brief = get().briefs[project.id];
        const all = generateFoundations(project, brief);
        if (!opts?.stagger) {
          set((s) => ({ deliverables: { ...s.deliverables, [project.id]: all } }));
          return;
        }
        // Génération « en direct » : les livrables apparaissent un à un.
        set((s) => ({ deliverables: { ...s.deliverables, [project.id]: all.map((d) => ({ ...d, status: "generating" as const })) } }));
        all.forEach((d, i) => {
          setTimeout(() => {
            set((s) => ({
              deliverables: {
                ...s.deliverables,
                [project.id]: (s.deliverables[project.id] ?? []).map((x) => (x.kind === d.kind ? { ...d, status: "to_review" as const, updatedAt: new Date().toISOString() } : x)),
              },
            }));
          }, 700 + i * 650);
        });
      },
      regenerateDeliverable(project, kind, feedback) {
        const cur = (get().deliverables[project.id] ?? []).find((d) => d.kind === kind);
        set((s) => ({
          deliverables: { ...s.deliverables, [project.id]: (s.deliverables[project.id] ?? []).map((d) => (d.kind === kind ? { ...d, status: "generating" as const } : d)) },
        }));
        setTimeout(() => {
          const next = generateDeliverable(kind, project, get().briefs[project.id], (cur?.version ?? 1) + 1);
          if (feedback && next.format === "markdown") next.content += `\n\n---\n\n_Version ${next.version} — retours pris en compte : ${feedback}_\n`;
          set((s) => ({
            deliverables: { ...s.deliverables, [project.id]: (s.deliverables[project.id] ?? []).map((d) => (d.kind === kind ? next : d)) },
          }));
        }, 1800);
      },
      validateDeliverable(projectId, kind) {
        set((s) => ({
          deliverables: {
            ...s.deliverables,
            [projectId]: (s.deliverables[projectId] ?? []).map((d) => (d.kind === kind ? { ...d, status: "validated" as const, updatedAt: new Date().toISOString() } : d)),
          },
        }));
      },
      updateDeliverableContent(projectId, kind, content) {
        set((s) => ({
          deliverables: {
            ...s.deliverables,
            [projectId]: (s.deliverables[projectId] ?? []).map((d) => (d.kind === kind ? { ...d, content, version: d.version + 1, updatedAt: new Date().toISOString() } : d)),
          },
        }));
      },

      approveRelease(projectId, releaseId) {
        set((s) => ({
          releases: {
            ...s.releases,
            [projectId]: (s.releases[projectId] ?? []).map((r) =>
              r.id === releaseId
                ? { ...r, env: "staging" as const, status: "running" as const, reviewer: "Vous", checks: r.checks.map((c) => (c.status === "pending" ? { ...c, status: "pass" as const, detail: "Validé par vous" } : c)) }
                : r,
            ),
          },
        }));
      },
      promoteRelease(projectId, releaseId, to) {
        set((s) => ({
          releases: {
            ...s.releases,
            [projectId]: (s.releases[projectId] ?? []).map((r) =>
              r.id === releaseId ? { ...r, env: to, status: to === "production" ? ("passed" as const) : ("running" as const), checks: r.checks.map((c) => (c.status === "pending" ? { ...c, status: "pass" as const } : c)) } : r,
            ),
          },
        }));
      },
      rollbackRelease(projectId, releaseId) {
        set((s) => ({
          releases: {
            ...s.releases,
            [projectId]: (s.releases[projectId] ?? []).map((r) => {
              if (r.id !== releaseId) return r;
              const i = Math.max(0, ENV_ORDER.indexOf(r.env) - 1);
              return { ...r, env: ENV_ORDER[i], status: "waiting" as const };
            }),
          },
        }));
      },
      createRelease(projectId, input) {
        const list = get().releases[projectId] ?? [];
        const release: Release = {
          id: `${projectId}-rel-${Date.now().toString(36)}`,
          projectId,
          version: nextVersion(list.map((r) => r.version)),
          title: input.title,
          env: "dev",
          status: "running",
          createdAt: new Date().toISOString(),
          items: input.items,
          checks: [
            { name: "Tests automatisés", status: "pending", detail: "En cours d'exécution" },
            { name: "Revue de sécurité IA", status: "pending", detail: "Analyse en cours" },
            { name: "Revue humaine", status: "pending", detail: "En attente de votre validation" },
          ],
        };
        set((s) => ({ releases: { ...s.releases, [projectId]: [release, ...(s.releases[projectId] ?? [])] } }));
        const patch = (fn: (r: Release) => Release) =>
          set((s) => ({ releases: { ...s.releases, [projectId]: (s.releases[projectId] ?? []).map((r) => (r.id === release.id && r.env === "dev" ? fn(r) : r)) } }));
        // Simulation : l'agent assemble la release, les contrôles passent, puis elle attend votre revue.
        setTimeout(() => patch((r) => ({ ...r, checks: r.checks.map((c, i) => (i === 0 ? { ...c, status: "pass" as const, detail: `${36 + input.items.length * 14} passés` } : c)) })), 1600);
        setTimeout(
          () => patch((r) => ({ ...r, env: "review" as const, status: "waiting" as const, checks: r.checks.map((c, i) => (i === 1 ? { ...c, status: "pass" as const, detail: "0 faille critique" } : c)) })),
          3400,
        );
        return release;
      },

      markFindingConverted(projectId, auditId, findingId) {
        set((s) => ({
          audits: {
            ...s.audits,
            [projectId]: (s.audits[projectId] ?? []).map((a) => (a.id === auditId ? { ...a, findings: a.findings.map((f) => (f.id === findingId ? { ...f, converted: true } : f)) } : a)),
          },
        }));
      },
      async runAudit(projectId) {
        await new Promise((r) => setTimeout(r, 2200));
        set((s) => ({
          audits: {
            ...s.audits,
            [projectId]: (s.audits[projectId] ?? []).map((a) => ({ ...a, date: new Date().toISOString(), score: Math.min(100, a.score + Math.round(Math.random() * 4)) })),
          },
        }));
      },

      toggleJourneyStep(projectId, stepId, done) {
        set((s) => ({
          journeys: {
            ...s.journeys,
            [projectId]: (s.journeys[projectId] ?? defaultJourney()).map((st) => (st.id === stepId ? { ...st, done: done ?? !st.done } : st)),
          },
        }));
      },

      registerEvent(id, registered) {
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, registered, seatsLeft: Math.max(0, e.seatsLeft + (registered ? -1 : 1)) } : e)) }));
      },
      joinLab(id, joined) {
        set((s) => ({ labs: s.labs.map((l) => (l.id === id ? { ...l, joined, members: l.members + (joined ? 1 : -1) } : l)) }));
      },
      likePost(id) {
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)) }));
      },
      addPost(post) {
        const profile = get().profile;
        const name = profile?.name?.trim() || "Vous";
        const initials = name
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        set((s) => ({
          posts: [{ id: `p${Date.now()}`, author: name, initials, role: "Membre BuildOS", likes: 0, comments: 0, at: new Date().toISOString(), ...post }, ...s.posts],
        }));
      },
      joinClub() {
        get().setProfile({ joinedClub: true });
      },

      setAssistantOpen(assistantOpen) {
        set({ assistantOpen });
      },
      resetBuildOS() {
        set(initial());
      },
    }),
    {
      name: "buildos.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        profile: s.profile,
        agents: s.agents,
        routing: s.routing,
        strategy: s.strategy,
        briefs: s.briefs,
        deliverables: s.deliverables,
        releases: s.releases,
        audits: s.audits,
        journeys: s.journeys,
        events: s.events,
        labs: s.labs,
        posts: s.posts,
      }),
    },
  ),
);

export { DELIVERABLE_KINDS };

/* Plusieurs onglets ouverts : chacun relit l'état quand un autre l'enregistre (sinon le dernier écrase tout). */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "buildos.v1") void useBuildOS.persist.rehydrate();
  });
}

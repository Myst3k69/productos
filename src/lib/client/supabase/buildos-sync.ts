import { useBuildOS } from "@/lib/buildos/store";
import { DEFAULT_AGENTS, DEFAULT_ROUTING } from "@/lib/buildos/fixtures";
import type { AuditReport, ClubEvent, ClubLab, ClubPost, CodingAgent, Deliverable, JourneyStep, ProjectBrief, Release, RoutingRule, RoutingStrategy } from "@/lib/buildos/types";
import type { BuildOSSupabase } from "@/lib/supabase/client";
import { getSupabase } from "@/lib/supabase/client";
import type { ProfileRow, UserPreferencesRow } from "@/lib/supabase/database.types";
import {
  auditToRow,
  briefToRow,
  deliverableToRow,
  journeyStepToRow,
  profileToColumns,
  releaseToRow,
  rowToAudit,
  rowToBrief,
  rowToClubEvent,
  rowToDeliverable,
  rowToExpert,
  rowToJourneyStep,
  rowToLab,
  rowToPost,
  rowToProfile,
  rowToRelease,
} from "./mappers";
import { useSession } from "./session";
import type { SyncQueue } from "./sync-queue";

/**
 * Synchronisation du store BuildOS (`useBuildOS`) avec Supabase.
 * - `hydrateBuildOS` remplace l'état local par celui de la base (au démarrage, ou pour les projets rejoints) ;
 * - `startBuildOSSync` observe le store et écrit chaque différence (par identité d'objet : le store est immuable).
 * Le store et ses actions restent inchangés : les écrans BuildOS fonctionnent à l'identique avec ou sans compte.
 */

let hydrating = false;
let unsubscribe: (() => void) | null = null;

type Maps = {
  briefs: Record<string, ProjectBrief>;
  deliverables: Record<string, Deliverable[]>;
  releases: Record<string, Release[]>;
  audits: Record<string, AuditReport[]>;
  journeys: Record<string, JourneyStep[]>;
};

function groupBy<T>(rows: T[], key: (r: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) (out[key(r)] ??= []).push(r);
  return out;
}

async function fetchProjectData(sb: BuildOSSupabase, ids: string[]): Promise<Maps> {
  const empty: Maps = { briefs: {}, deliverables: {}, releases: {}, audits: {}, journeys: {} };
  if (!ids.length) return empty;
  const [b, d, r, a, j] = await Promise.all([
    sb.from("project_briefs").select("*").in("project_id", ids),
    sb.from("deliverables").select("*").in("project_id", ids),
    sb.from("releases").select("*").in("project_id", ids).order("created_at", { ascending: false }),
    sb.from("audit_reports").select("*").in("project_id", ids),
    sb.from("journey_steps").select("*").in("project_id", ids).order("day"),
  ]);
  for (const res of [b, d, r, a, j]) if (res.error) console.warn("[buildos] chargement", res.error);
  const deliverables = groupBy((d.data ?? []).map(rowToDeliverable), (x) => x.projectId);
  const releases = groupBy((r.data ?? []).map(rowToRelease), (x) => x.projectId);
  const audits = groupBy((a.data ?? []).map(rowToAudit), (x) => x.projectId);
  const journeysRows = groupBy(j.data ?? [], (x) => x.project_id);
  const journeys: Record<string, JourneyStep[]> = {};
  for (const [pid, rows] of Object.entries(journeysRows)) journeys[pid] = rows.map(rowToJourneyStep);
  const briefs: Record<string, ProjectBrief> = {};
  for (const row of b.data ?? []) briefs[row.project_id] = rowToBrief(row);
  return { briefs, deliverables, releases, audits, journeys };
}

async function fetchClub(sb: BuildOSSupabase, userId: string) {
  const [ev, reg, labs, mem, posts, likes, experts] = await Promise.all([
    sb.from("club_events").select("*").eq("published", true).order("starts_at"),
    sb.from("club_event_registrations").select("event_id").eq("user_id", userId),
    sb.from("club_labs").select("*").eq("published", true).order("created_at"),
    sb.from("club_lab_members").select("lab_id").eq("user_id", userId),
    sb.from("club_posts").select("*").order("created_at", { ascending: false }).limit(100),
    sb.from("club_post_likes").select("post_id").eq("user_id", userId),
    sb.from("experts").select("*").eq("published", true).order("sort"),
  ]);
  const registered = new Set((reg.data ?? []).map((r) => r.event_id));
  const joined = new Set((mem.data ?? []).map((r) => r.lab_id));
  const liked = new Set((likes.data ?? []).map((r) => r.post_id));
  return {
    events: (ev.data ?? []).map((r) => rowToClubEvent(r, registered.has(r.id))),
    labs: (labs.data ?? []).map((r) => rowToLab(r, joined.has(r.id))),
    posts: (posts.data ?? []).filter((p) => !p.hidden).map((r) => rowToPost(r, liked.has(r.id))),
    experts: (experts.data ?? []).map(rowToExpert),
  };
}

export async function hydrateBuildOS(
  sb: BuildOSSupabase,
  opts: { userId: string; projectIds: string[]; profile?: ProfileRow; prefs?: UserPreferencesRow | null; partial?: boolean },
): Promise<void> {
  const maps = await fetchProjectData(sb, opts.projectIds);
  hydrating = true;
  try {
    if (opts.partial) {
      useBuildOS.setState((s) => ({
        briefs: { ...s.briefs, ...maps.briefs },
        deliverables: { ...s.deliverables, ...maps.deliverables },
        releases: { ...s.releases, ...maps.releases },
        audits: { ...s.audits, ...maps.audits },
        journeys: { ...s.journeys, ...maps.journeys },
      }));
      return;
    }
    const club = await fetchClub(sb, opts.userId);
    // Cache navigateur propre au compte (la démo garde « buildos.v1 »).
    useBuildOS.persist.setOptions({ name: `buildos.cloud.${opts.userId}` });
    const p = opts.profile;
    const prefs = opts.prefs;
    useBuildOS.setState({
      profile: p && (p.onboarded || p.name) ? rowToProfile(p) : null,
      agents: (prefs?.agents as unknown as CodingAgent[] | null) ?? DEFAULT_AGENTS,
      routing: (prefs?.routing as unknown as RoutingRule[] | null) ?? DEFAULT_ROUTING,
      strategy: (prefs?.strategy as RoutingStrategy | null) ?? "balanced",
      ...maps,
      ...club,
    });
  } finally {
    hydrating = false;
  }
}

/** Écrit dans la file les différences d'une liste d'objets identifiés. */
function diffList<T extends { id: string }>(next: T[] | undefined, prev: T[] | undefined, write: (item: T) => void) {
  if (!next || next === prev) return;
  const before = new Map((prev ?? []).map((x) => [x.id, x]));
  for (const item of next) if (before.get(item.id) !== item) write(item);
}

export function startBuildOSSync(queue: SyncQueue, userId: string, canEdit: (projectId: string) => boolean): void {
  unsubscribe?.();
  unsubscribe = useBuildOS.subscribe((s, prev) => {
    if (hydrating) return;

    if (s.profile && s.profile !== prev.profile) {
      queue.patch("profiles", userId, { id: userId }, profileToColumns(s.profile));
      const session = useSession.getState();
      if (session.profile) session.set({ profile: { ...session.profile, ...profileToColumns(s.profile) } });
    }
    if (s.agents !== prev.agents || s.routing !== prev.routing || s.strategy !== prev.strategy) {
      queue.upsert("user_preferences", userId, { user_id: userId, agents: s.agents, routing: s.routing, strategy: s.strategy }, "user_id");
    }

    if (s.briefs !== prev.briefs) {
      for (const [pid, b] of Object.entries(s.briefs)) {
        if (b !== prev.briefs[pid] && canEdit(pid)) queue.upsert("project_briefs", pid, briefToRow(b), "project_id");
      }
    }
    if (s.deliverables !== prev.deliverables) {
      for (const pid of Object.keys(s.deliverables)) {
        if (!canEdit(pid)) continue;
        diffList(s.deliverables[pid], prev.deliverables[pid], (d) => queue.upsert("deliverables", d.id, deliverableToRow(d), "id"));
      }
    }
    if (s.releases !== prev.releases) {
      for (const pid of Object.keys(s.releases)) {
        if (!canEdit(pid)) continue;
        diffList(s.releases[pid], prev.releases[pid], (r) => queue.upsert("releases", r.id, releaseToRow(r), "id"));
      }
    }
    if (s.audits !== prev.audits) {
      for (const pid of Object.keys(s.audits)) {
        if (!canEdit(pid)) continue;
        diffList(s.audits[pid], prev.audits[pid], (a) => queue.upsert("audit_reports", a.id, auditToRow(a), "id"));
      }
    }
    if (s.journeys !== prev.journeys) {
      for (const pid of Object.keys(s.journeys)) {
        if (!canEdit(pid)) continue;
        diffList(s.journeys[pid], prev.journeys[pid], (st) => queue.upsert("journey_steps", `${pid}:${st.id}`, journeyStepToRow(pid, st), "project_id,id"));
      }
    }

    if (s.events !== prev.events) syncFlags<ClubEvent>(s.events, prev.events, (e) => e.registered, (e, on) => {
      if (on) queue.insert("club_event_registrations", `reg:${e.id}`, { event_id: e.id, user_id: userId });
      else queue.remove("club_event_registrations", `reg:${e.id}`, { event_id: e.id, user_id: userId });
    });
    if (s.labs !== prev.labs) syncFlags<ClubLab>(s.labs, prev.labs, (l) => l.joined, (l, on) => {
      if (on) queue.insert("club_lab_members", `lab:${l.id}`, { lab_id: l.id, user_id: userId });
      else queue.remove("club_lab_members", `lab:${l.id}`, { lab_id: l.id, user_id: userId });
    });
    if (s.posts !== prev.posts) {
      const known = new Set(prev.posts.map((p) => p.id));
      for (const p of s.posts) {
        if (!known.has(p.id)) queue.insert("club_posts", p.id, { id: p.id, kind: p.kind, content: p.content, project: p.project ?? null });
      }
      syncFlags<ClubPost>(s.posts, prev.posts, (p) => p.liked, (p, on) => {
        if (on) queue.insert("club_post_likes", `like:${p.id}`, { post_id: p.id, user_id: userId });
        else queue.remove("club_post_likes", `like:${p.id}`, { post_id: p.id, user_id: userId });
      });
    }
  });
}

function syncFlags<T extends { id: string }>(next: T[], prev: T[], flag: (x: T) => boolean | undefined, write: (x: T, on: boolean) => void) {
  const before = new Map(prev.map((x) => [x.id, x]));
  for (const x of next) {
    const p = before.get(x.id);
    if (p && p !== x && Boolean(flag(p)) !== Boolean(flag(x))) write(x, Boolean(flag(x)));
  }
}

export function stopBuildOSSync(): void {
  unsubscribe?.();
  unsubscribe = null;
}

/* ─────────────────────────── Réservations d'experts ─────────────────────────── */

export interface BookingInput {
  expertId: string;
  slot: string;
  shared: boolean;
  price: number;
  topic?: string;
}

/** Enregistre une demande de réservation (mode compte uniquement ; sans effet en démo). */
export function recordExpertBooking(b: BookingInput): void {
  if (useSession.getState().mode !== "cloud") return;
  void getSupabase()
    .from("expert_bookings")
    .insert({ expert_id: b.expertId, slot: b.slot, shared: b.shared, price: b.price, topic: b.topic ?? "" })
    .then(({ error }) => {
      if (error) console.warn("[buildos] réservation", error);
    });
}

/** Réservations du compte courant (mode compte). */
export async function loadMyBookings(): Promise<{ id: string; expertId: string; slot: string; shared: boolean; price: number; at: string; status: string }[] | null> {
  const s = useSession.getState();
  if (s.mode !== "cloud" || !s.userId) return null;
  const { data, error } = await getSupabase().from("expert_bookings").select("*").eq("user_id", s.userId).neq("status", "cancelled").order("created_at", { ascending: false });
  if (error) return null;
  return (data ?? []).map((r) => ({ id: r.id, expertId: r.expert_id, slot: r.slot, shared: r.shared, price: r.price, at: r.created_at, status: r.status }));
}

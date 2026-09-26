"use client";

import { create } from "zustand";
import type { MemberRole, ProfileRow } from "@/lib/supabase/database.types";

/**
 * Contexte de session en mode Supabase : compte, profil, rôle par projet.
 * Alimenté par la source de données au démarrage ; lu par l'interface (bandeau lecture seule, admin, équipe…).
 */
interface SessionState {
  mode: "local" | "cloud";
  userId: string | null;
  email: string | null;
  profile: ProfileRow | null;
  /** Rôle du compte sur chaque projet chargé */
  roles: Record<string, MemberRole>;
  /** Écritures en attente d'envoi */
  syncing: boolean;
  set(patch: Partial<Omit<SessionState, "set">>): void;
}

export const useSession = create<SessionState>()((set) => ({
  mode: "local",
  userId: null,
  email: null,
  profile: null,
  roles: {},
  syncing: false,
  set: (patch) => set(patch),
}));

export function useProjectRole(projectId: string | null): MemberRole | null {
  return useSession((s) => (s.mode === "cloud" && projectId ? s.roles[projectId] ?? null : "owner"));
}

export function useIsAdmin(): boolean {
  return useSession((s) => s.profile?.app_role === "admin" && !s.profile?.suspended_at);
}

export const ROLE_LABEL: Record<MemberRole, string> = { owner: "Propriétaire", member: "Membre", viewer: "Lecteur" };

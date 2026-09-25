"use client";

import { useBuildOS } from "@/lib/buildos/store";
import { initials } from "@/lib/client/utils";

/** Identité du fondateur (profil BuildOS), avec des valeurs de repli sobres. */
export function useFounder(): { fullName: string; firstName: string; initials: string; hasName: boolean } {
  const name = useBuildOS((s) => s.profile?.name?.trim() ?? "");
  const fullName = name || "Fondateur";
  return {
    fullName,
    firstName: name ? name.split(/\s+/)[0] : "Fondateur",
    initials: name ? initials(name) : "F",
    hasName: Boolean(name),
  };
}

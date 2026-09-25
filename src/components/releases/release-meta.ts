import { Bot, FlaskConical, Rocket, ScanEye, type LucideIcon } from "lucide-react";
import type { EnvId, Release } from "@/lib/buildos/types";

export const ENVS: EnvId[] = ["dev", "review", "staging", "production"];

export const ENV_META: Record<EnvId, { label: string; sub: string; icon: LucideIcon; empty: string }> = {
  dev: { label: "Développement", sub: "par l'agent", icon: Bot, empty: "Aucun développement en cours." },
  review: { label: "Revue humaine", sub: "code, sécurité, qualité", icon: ScanEye, empty: "Rien à relire pour l'instant." },
  staging: { label: "Préproduction", sub: "tests et validation", icon: FlaskConical, empty: "Rien en préproduction." },
  production: { label: "Production", sub: "mise en ligne", icon: Rocket, empty: "Pas encore en ligne." },
};

export function projectSlug(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "projet"
  );
}

/** Adresse simulée d'un environnement. */
export function envUrl(projectName: string, env: "staging" | "production"): string {
  const slug = projectSlug(projectName);
  return env === "staging" ? `https://preprod.${slug}.buildos.app` : `https://${slug}.buildos.app`;
}

export function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export type ReleaseTone = "ai" | "accent" | "ok" | "danger" | "neutral";

export function releaseStatus(r: Release): { label: string; tone: ReleaseTone } {
  if (r.status === "failed") return { label: "Échec", tone: "danger" };
  switch (r.env) {
    case "dev":
      return r.status === "running" ? { label: "L'agent assemble", tone: "ai" } : { label: "En attente", tone: "neutral" };
    case "review":
      return { label: "À relire", tone: "accent" };
    case "staging":
      return r.status === "running" ? { label: "Recette en cours", tone: "ai" } : { label: "Prête à partir", tone: "accent" };
    case "production":
      return { label: "En ligne", tone: "ok" };
  }
}

/** Release actuellement en ligne (la plus récente en production). */
export function currentProduction(list: Release[]): Release | null {
  return (
    list
      .filter((r) => r.env === "production")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

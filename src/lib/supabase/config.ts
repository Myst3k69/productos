/**
 * Configuration Supabase (partagée navigateur / serveur / proxy).
 * Sans NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, BuildOS reste en mode prototype
 * (données locales, pas de comptes) : exactement le comportement historique.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** Cookie posé par « Voir la démo » : l'application tourne alors en local, sans compte. */
export const DEMO_COOKIE = "buildos_demo";

/** Routes accessibles sans session (en plus des fichiers statiques). */
export const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/auth", "/demo"];

/** Écrans d'authentification : un utilisateur connecté y est renvoyé vers l'application. */
export const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

export function matchesPath(pathname: string, bases: string[]): boolean {
  return bases.some((b) => (b === "/" ? pathname === "/" : pathname === b || pathname.startsWith(`${b}/`)));
}

/** N'accepte qu'un chemin interne (évite les redirections ouvertes). */
export function safeNext(next: string | null | undefined, fallback = "/home"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Le navigateur est-il en mode démo (cookie posé par /demo) ? */
export function isDemoBrowser(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim() === `${DEMO_COOKIE}=1`);
}

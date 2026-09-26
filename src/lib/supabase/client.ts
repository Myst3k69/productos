import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from "./config";

export type BuildOSSupabase = SupabaseClient<Database>;

let client: BuildOSSupabase | null = null;

/** Client Supabase du navigateur (session dans les cookies, partagée avec le proxy et le serveur). */
export function getSupabase(): BuildOSSupabase {
  if (!supabaseConfigured) throw new Error("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  if (!client) client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}

/** Message lisible (en français quand c'est possible) pour une erreur Supabase / PostgREST. */
export function supabaseErrorMessage(err: unknown): string {
  if (!err) return "Erreur inconnue.";
  const e = err as { message?: string; code?: string; details?: string };
  const msg = e.message ?? String(err);
  if (e.code === "42501" && /row-level security/i.test(msg)) return "Action non autorisée pour votre rôle sur ce projet.";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Connexion au serveur impossible. Vérifiez votre réseau.";
  return msg;
}

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileRow } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/** Client Supabase côté serveur (composants serveur, route handlers), lié aux cookies de la requête. */
export async function createSupabaseServer(): Promise<SupabaseClient<Database>> {
  const store = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* appelé depuis un composant serveur : le proxy rafraîchit la session */
        }
      },
    },
  });
}

/** Utilisateur courant et son profil (null si non connecté). Vérifie le jeton auprès de Supabase Auth. */
export async function getCurrentProfile(): Promise<{ userId: string; email: string; profile: ProfileRow | null } | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  return { userId: data.user.id, email: data.user.email ?? "", profile: profile ?? null };
}

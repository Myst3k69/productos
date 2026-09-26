"use client";

import * as React from "react";
import { toast } from "sonner";
import { getSupabase, supabaseErrorMessage, type BuildOSSupabase } from "@/lib/supabase/client";

/** Charge une donnée d'administration (RPC ou requête), avec rechargement manuel. */
export function useAdminData<T>(load: (sb: BuildOSSupabase) => PromiseLike<{ data: T | null; error: unknown }>, deps: React.DependencyList = []) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const loader = React.useCallback(load, deps);

  const reload = React.useCallback(async () => {
    setLoading(true);
    const { data: d, error: e } = await loader(getSupabase());
    if (e) setError(supabaseErrorMessage(e));
    else {
      setError(null);
      setData(d);
    }
    setLoading(false);
  }, [loader]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

/** Exécute une action d'administration : toast de succès ou d'erreur, puis rechargement éventuel. */
export async function adminAction(fn: (sb: BuildOSSupabase) => PromiseLike<{ error: unknown }>, success: string, after?: () => unknown): Promise<boolean> {
  const { error } = await fn(getSupabase());
  if (error) {
    toast.error("Action impossible", { description: supabaseErrorMessage(error) });
    return false;
  }
  toast.success(success);
  await after?.();
  return true;
}

export const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;
export const usd = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

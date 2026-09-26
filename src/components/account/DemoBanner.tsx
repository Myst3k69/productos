"use client";

import * as React from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import { isDemoBrowser, supabaseConfigured } from "@/lib/supabase/config";

/** Bandeau de la démo (comptes activés) : rien n'est enregistré, invitation à créer un compte. */
export function DemoBanner() {
  const [demo, setDemo] = React.useState(false);
  React.useEffect(() => setDemo(supabaseConfigured && isDemoBrowser()), []);
  if (!demo) return null;
  return (
    <div role="status" className="flex shrink-0 items-center justify-center gap-2 border-b border-line bg-lime px-4 py-1.5 text-[12.5px] text-lime-ink">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">
        <strong className="font-semibold">Démo</strong> · données d&apos;exemple stockées dans ce navigateur, rien n&apos;est enregistré sur votre compte.
      </span>
      <a href="/demo/exit?to=/signup" className="inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline">
        Créer mon compte <ArrowRight className="h-3 w-3" aria-hidden />
      </a>
      <a href="/demo/exit?to=/login" className="hidden shrink-0 font-medium underline-offset-2 hover:underline sm:inline">
        Se connecter
      </a>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { DEMO_COOKIE, safeNext } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "./PasswordInput";
import { authErrorMessage } from "./auth-errors";
import { FormAlert } from "./FormAlert";

export function clearDemoCookie() {
  document.cookie = `${DEMO_COOKIE}=; Max-Age=0; path=/`;
}

/** Connexion par e-mail et mot de passe. */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(params.get("error"));
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(authErrorMessage(err));
      setBusy(false);
      return;
    }
    clearDemoCookie();
    router.replace(next);
    router.refresh();
  }

  const withNext = (path: string) => (params.get("next") ? `${path}?next=${encodeURIComponent(next)}` : path);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error ? <FormAlert tone="danger">{error}</FormAlert> : null}
      <Field label="Adresse e-mail" htmlFor="login-email">
        <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-[14.5px]" placeholder="vous@startup.fr" autoFocus />
      </Field>
      <Field
        label={
          <span className="flex items-center justify-between">
            Mot de passe
            <Link href="/forgot-password" className="text-[12px] font-medium text-accent-ink hover:underline">
              Mot de passe oublié ?
            </Link>
          </span>
        }
        htmlFor="login-password"
      >
        <PasswordInput id="login-password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" variant="ink" size="lg" loading={busy} disabled={!email.trim() || !password} className="mt-2 w-full">
        Se connecter <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
      <p className="text-center text-[13px] text-ink-3">
        Pas encore de compte ?{" "}
        <Link href={withNext("/signup")} className="font-semibold text-ink underline-offset-2 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

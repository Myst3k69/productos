"use client";

import * as React from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { authErrorMessage } from "./auth-errors";
import { FormAlert } from "./FormAlert";

/** Demande d'un lien de réinitialisation du mot de passe. */
export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
    });
    setBusy(false);
    if (err) setError(authErrorMessage(err));
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert tone="ok">
          Si un compte existe pour <strong>{email.trim()}</strong>, un lien de réinitialisation vient d&apos;être envoyé. Ouvrez-le dans ce navigateur.
        </FormAlert>
        <Link href="/login" className="text-[13px] font-semibold text-ink underline-offset-2 hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error ? <FormAlert tone="danger">{error}</FormAlert> : null}
      <Field label="Adresse e-mail du compte" htmlFor="forgot-email">
        <Input id="forgot-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-[14.5px]" placeholder="vous@startup.fr" autoFocus />
      </Field>
      <Button type="submit" variant="ink" size="lg" loading={busy} disabled={!email.trim()} className="mt-2 w-full">
        Recevoir le lien
      </Button>
      <Link href="/login" className="text-center text-[13px] font-semibold text-ink underline-offset-2 hover:underline">
        Retour à la connexion
      </Link>
    </form>
  );
}

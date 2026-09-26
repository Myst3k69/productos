"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { PasswordInput } from "./PasswordInput";
import { authErrorMessage, passwordProblem } from "./auth-errors";
import { FormAlert } from "./FormAlert";

/** Nouveau mot de passe, après ouverture du lien de réinitialisation (session de récupération). */
export function ResetPasswordForm() {
  const router = useRouter();
  const [session, setSession] = React.useState<"loading" | "ok" | "none">("loading");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void getSupabase()
      .auth.getUser()
      .then(({ data }) => setSession(data.user ? "ok" : "none"));
  }, []);

  const issue = passwordProblem(password) ?? (confirm && confirm !== password ? "Les deux saisies ne correspondent pas." : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (issue || confirm !== password) return;
    setBusy(true);
    setError(null);
    const { error: err } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    router.replace("/home");
    router.refresh();
  }

  if (session === "loading") {
    return (
      <div className="flex items-center gap-2 text-[13px] text-ink-3">
        <Spinner size={14} /> Vérification du lien…
      </div>
    );
  }
  if (session === "none") {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert tone="info">Ce lien a expiré ou a été ouvert dans un autre navigateur. Demandez-en un nouveau.</FormAlert>
        <Link href="/forgot-password" className="text-[13px] font-semibold text-ink underline-offset-2 hover:underline">
          Recevoir un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error ? <FormAlert tone="danger">{error}</FormAlert> : null}
      <Field label="Nouveau mot de passe" htmlFor="reset-password" hint="8 caractères minimum, avec lettres et chiffres." error={touched ? passwordProblem(password) : null}>
        <PasswordInput id="reset-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </Field>
      <Field label="Confirmez-le" htmlFor="reset-confirm" error={touched && confirm !== password ? "Les deux saisies ne correspondent pas." : null}>
        <PasswordInput id="reset-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" variant="ink" size="lg" loading={busy} className="mt-2 w-full">
        Enregistrer et continuer
      </Button>
    </form>
  );
}

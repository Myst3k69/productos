"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { safeNext } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "./PasswordInput";
import { authErrorMessage, passwordProblem } from "./auth-errors";
import { FormAlert } from "./FormAlert";
import { clearDemoCookie } from "./LoginForm";

/** Inscription : nom, e-mail, mot de passe. Confirmation par e-mail si activée dans Supabase. */
export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/onboarding");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const pwdIssue = passwordProblem(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (pwdIssue || !email.trim() || !name.trim()) return;
    setBusy(true);
    setError(null);
    const redirect = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
    const { data, error: err } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: redirect },
    });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    if (data.session) {
      // Confirmation d'e-mail désactivée : la session est ouverte immédiatement.
      clearDemoCookie();
      router.replace(next);
      router.refresh();
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-line bg-card p-5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime text-lime-ink">
            <MailCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[14.5px] font-semibold text-ink">Vérifiez votre boîte mail</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              Un lien de confirmation a été envoyé à <strong className="text-ink">{sentTo}</strong>. Ouvrez-le dans ce navigateur pour activer votre compte et démarrer
              votre projet.
            </p>
          </div>
        </div>
        <p className="text-[12.5px] text-ink-3">Rien reçu après 2 minutes ? Regardez dans les indésirables, ou recommencez avec une autre adresse.</p>
        <Button variant="secondary" onClick={() => setSentTo(null)}>
          Modifier l&apos;adresse
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error ? <FormAlert tone="danger">{error}</FormAlert> : null}
      <Field label="Votre prénom et nom" htmlFor="signup-name" error={touched && !name.trim() ? "Indiquez votre nom." : null}>
        <Input id="signup-name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-[14.5px]" placeholder="Camille Martin" autoFocus />
      </Field>
      <Field label="Adresse e-mail" htmlFor="signup-email" error={touched && !email.trim() ? "Indiquez votre e-mail." : null}>
        <Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-[14.5px]" placeholder="vous@startup.fr" />
      </Field>
      <Field label="Mot de passe" htmlFor="signup-password" error={touched ? pwdIssue : null} hint="8 caractères minimum, avec lettres et chiffres.">
        <PasswordInput id="signup-password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" variant="ink" size="lg" loading={busy} className="mt-2 w-full">
        Créer mon compte <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
      <p className="text-center text-[12px] leading-relaxed text-ink-3">
        En créant un compte, vous acceptez que vos projets soient hébergés par BuildOS (Supabase, région Paris).
      </p>
      <p className="text-center text-[13px] text-ink-3">
        Déjà inscrit ?{" "}
        <Link href={params.get("next") ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-ink underline-offset-2 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

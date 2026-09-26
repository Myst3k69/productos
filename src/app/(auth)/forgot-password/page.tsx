import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function Page() {
  return (
    <AuthShell title="Mot de passe oublié ?" subtitle="Indiquez votre adresse : nous vous envoyons un lien pour en choisir un nouveau.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}

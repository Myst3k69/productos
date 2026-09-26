import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function Page() {
  return (
    <AuthShell title="Nouveau mot de passe." subtitle="Choisissez-le solide : il protège vos projets et ceux de votre équipe.">
      <ResetPasswordForm />
    </AuthShell>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function Page() {
  return (
    <AuthShell
      title="Lancez votre projet."
      subtitle="Un compte pour sauvegarder votre travail, inviter vos cofondateurs et rejoindre le Build Club."
      footer={
        <>
          Juste curieux ?{" "}
          <Link href="/demo" className="font-semibold text-ink underline-offset-2 hover:underline">
            Voir la démo sans compte
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}

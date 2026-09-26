import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Admin BuildOS" }, robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Administration BuildOS : réservée aux comptes `app_role = admin`.
 * Le contrôle est fait ici côté serveur, puis de nouveau par chaque fonction RPC en base (assert_admin).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured) return <Denied title="Administration indisponible" detail="Les comptes ne sont pas activés sur cette instance (Supabase non configuré)." />;
  const me = await getCurrentProfile();
  if (!me) redirect("/login?next=/admin");
  if (!me.profile || me.profile.app_role !== "admin" || me.profile.suspended_at) {
    return <Denied title="Accès réservé à l'équipe BuildOS" detail="Votre compte n'a pas les droits d'administration. Si c'est une erreur, demandez à un administrateur de vous promouvoir." />;
  }
  return (
    <AdminShell name={me.profile.name || me.email} email={me.email}>
      {children}
    </AdminShell>
  );
}

function Denied({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5">
      <div className="max-w-md text-center reveal">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-[28px] font-extrabold leading-[0.95] tracking-[-0.04em] text-ink">{title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{detail}</p>
        <Link href="/home" className="mt-6 inline-flex h-10 items-center rounded-md bg-ink px-4 text-[13.5px] font-semibold text-paper hover:bg-ink/85">
          Retour à l&apos;application
        </Link>
      </div>
    </main>
  );
}

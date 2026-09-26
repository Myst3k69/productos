import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { DEMO_COOKIE, safeNext, supabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Retour des liens envoyés par e-mail (confirmation d'inscription, réinitialisation du mot de passe).
 * Accepte les deux formats Supabase : `?code=` (PKCE, même navigateur) et `?token_hash=&type=` (modèle d'e-mail personnalisé).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"), "/home");
  const fail = (message: string) => {
    const to = new URL("/login", url.origin);
    to.searchParams.set("error", message);
    return NextResponse.redirect(to);
  };

  if (!supabaseConfigured) return fail("Les comptes ne sont pas activés sur cette instance.");

  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) return fail(/expired/i.test(providerError) ? "Ce lien a expiré. Demandez-en un nouveau." : "Ce lien n'est plus valide.");

  const supabase = await createSupabaseServer();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) return fail("Ouvrez le lien dans le navigateur où vous avez fait la demande, ou connectez-vous directement.");
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) return fail("Ce lien a expiré ou a déjà été utilisé.");
  }

  if (!ok) return fail("Lien de confirmation incomplet.");

  const destination = type === "recovery" && next === "/home" ? "/reset-password" : next;
  const res = NextResponse.redirect(new URL(destination, url.origin));
  res.cookies.delete(DEMO_COOKIE);
  return res;
}

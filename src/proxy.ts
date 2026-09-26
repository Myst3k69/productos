import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { AUTH_PAGES, DEMO_COOKIE, PUBLIC_PATHS, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, matchesPath, safeNext, supabaseConfigured } from "@/lib/supabase/config";

/**
 * Proxy (ex-middleware) : rafraîchit la session Supabase et protège l'application.
 *  - sans Supabase configuré : aucun contrôle (mode prototype historique) ;
 *  - pages publiques : landing, authentification, démo ;
 *  - application : session requise, sauf en mode démo (cookie) ;
 *  - /admin : session toujours requise (le rôle admin est vérifié par la mise en page serveur).
 * Les routes /api/* (back-office en veille) ne sont pas concernées.
 */
export async function proxy(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Vérifie (et rafraîchit si besoin) la session. Ne rien intercaler avant cet appel.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  const demo = request.cookies.get(DEMO_COOKIE)?.value === "1";

  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    const [path, query] = to.split("?");
    url.pathname = path;
    url.search = query ? `?${query}` : "";
    const res = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (signedIn && matchesPath(pathname, AUTH_PAGES)) {
    return redirect(safeNext(request.nextUrl.searchParams.get("next")));
  }

  if (matchesPath(pathname, PUBLIC_PATHS)) return response;

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!signedIn && (isAdmin || !demo)) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return redirect(`${pathname.startsWith("/onboarding") ? "/signup" : "/login"}?next=${next}`);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)"],
};

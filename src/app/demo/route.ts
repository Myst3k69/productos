import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** « Voir la démo » : l'application tourne en local (données simulées, aucun compte). */
export function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/home", request.url));
  res.cookies.set(DEMO_COOKIE, "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

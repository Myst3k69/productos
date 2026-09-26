import { NextResponse } from "next/server";
import { DEMO_COOKIE, safeNext } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** Quitte la démo, vers la page demandée (inscription par défaut). */
export function GET(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL(safeNext(url.searchParams.get("to"), "/signup"), url.origin));
  res.cookies.delete(DEMO_COOKIE);
  return res;
}

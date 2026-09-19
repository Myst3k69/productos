import { fail, handleError, ok } from "@/lib/server/http";
import { inspectPath, suggestedWorkspace } from "@/lib/server/projects";

export const dynamic = "force-dynamic";

/** Inspection d'un chemin local (création de projet) et suggestion d'emplacement. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams.get("path");
  const name = url.searchParams.get("suggestFor");
  try {
    if (name !== null) return ok({ suggested: suggestedWorkspace(name) });
    if (!p) return fail("Paramètre « path » manquant.");
    return ok(await inspectPath(p));
  } catch (err) {
    return handleError(err);
  }
}

import fs from "node:fs/promises";
import { fail, handleError, ok, type Params } from "@/lib/server/http";
import { getArtifact } from "@/lib/server/repo";
import { isTextFile, readTextCapped } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";

/** Contenu d'un artefact (texte stocké, ou lecture du fichier sur disque). */
export async function GET(req: Request, { params }: Params<{ id: string; artifactId: string }>) {
  const { id, artifactId } = await params;
  const raw = new URL(req.url).searchParams.get("raw") === "1";
  try {
    const artifact = await getArtifact(artifactId);
    if (!artifact || artifact.taskId !== id) return fail("Artefact introuvable.", 404);
    if (raw && artifact.path) {
      try {
        const buf = await fs.readFile(artifact.path);
        return new Response(buf, { headers: { "content-type": artifact.mime ?? "application/octet-stream" } });
      } catch {
        return fail("Fichier introuvable sur le disque.", 404);
      }
    }
    if (artifact.content != null) return ok({ artifact });
    if (artifact.path && isTextFile(artifact.path)) {
      try {
        const { content, size, truncated } = await readTextCapped(artifact.path);
        return ok({ artifact: { ...artifact, content, size }, truncated });
      } catch {
        return ok({ artifact, missing: true });
      }
    }
    return ok({ artifact });
  } catch (err) {
    return handleError(err);
  }
}

import { probeClaude, publishAIStatus } from "@/lib/server/engine";
import { handleError, ok } from "@/lib/server/http";
import { runner } from "@/lib/server/runner";

export const dynamic = "force-dynamic";

/** Teste la connexion au moteur Claude (petit appel réel). */
export async function POST() {
  try {
    const result = await probeClaude();
    const ai = await publishAIStatus(runner().status());
    return ok({ result, ai });
  } catch (err) {
    return handleError(err);
  }
}

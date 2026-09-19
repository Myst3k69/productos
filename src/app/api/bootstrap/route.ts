import { computeAIStatus } from "@/lib/server/engine";
import { handleError, ok } from "@/lib/server/http";
import { listProjects, listTasks } from "@/lib/server/repo";
import { runner } from "@/lib/server/runner";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await runner().boot();
    const [projects, tasks, settings] = await Promise.all([listProjects(), listTasks(), getSettings()]);
    const ai = await computeAIStatus(runner().status());
    return ok({ projects, tasks, settings, ai, now: new Date().toISOString() });
  } catch (err) {
    return handleError(err);
  }
}

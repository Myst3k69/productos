import { CreateTaskSchema } from "@/lib/domain/types";
import { applyAction } from "@/lib/server/actions";
import { fail, handleError, ok, parseBody } from "@/lib/server/http";
import { createTask, getProject, listTasks } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? undefined;
  try {
    return ok({ tasks: await listTasks(projectId) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, CreateTaskSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const project = await getProject(parsed.data.projectId);
    if (!project) return fail("Projet introuvable.", 404);
    let task = await createTask(parsed.data);
    const autonomy = parsed.data.autonomy ?? project.autonomy;
    if (parsed.data.startNow && autonomy !== "manual") {
      task = await applyAction(task.id, { action: "start" });
    }
    return ok({ task }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

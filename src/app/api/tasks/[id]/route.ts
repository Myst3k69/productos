import { UpdateTaskSchema } from "@/lib/domain/types";
import { fail, handleError, ok, parseBody, type Params } from "@/lib/server/http";
import { deleteTask, getTask, listArtifacts, listEvents, patchTask } from "@/lib/server/repo";
import { runner } from "@/lib/server/runner";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: Params<{ id: string }>) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) return fail("Tâche introuvable.", 404);
  const [events, artifacts] = await Promise.all([listEvents(id), listArtifacts(id)]);
  return ok({ task, events, artifacts });
}

export async function PATCH(req: Request, { params }: Params<{ id: string }>) {
  const { id } = await params;
  const parsed = await parseBody(req, UpdateTaskSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const task = await patchTask(id, parsed.data);
    if (!task) return fail("Tâche introuvable.", 404);
    return ok({ task });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params<{ id: string }>) {
  const { id } = await params;
  try {
    runner().cancel(id);
    await deleteTask(id);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

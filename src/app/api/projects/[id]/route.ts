import { UpdateProjectSchema } from "@/lib/domain/types";
import { fail, handleError, ok, parseBody, type Params } from "@/lib/server/http";
import { updateProjectWithSetup } from "@/lib/server/projects";
import { deleteProject, getProject, listTasks } from "@/lib/server/repo";
import { runner } from "@/lib/server/runner";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: Params<{ id: string }>) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return fail("Projet introuvable.", 404);
  return ok({ project, tasks: await listTasks(id) });
}

export async function PATCH(req: Request, { params }: Params<{ id: string }>) {
  const { id } = await params;
  const parsed = await parseBody(req, UpdateProjectSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const project = await updateProjectWithSetup(id, parsed.data);
    if (!project) return fail("Projet introuvable.", 404);
    return ok({ project });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params<{ id: string }>) {
  const { id } = await params;
  try {
    const tasks = await listTasks(id);
    for (const t of tasks) runner().cancel(t.id);
    await deleteProject(id);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

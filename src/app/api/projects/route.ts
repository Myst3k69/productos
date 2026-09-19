import { CreateProjectSchema } from "@/lib/domain/types";
import { fail, handleError, ok, parseBody } from "@/lib/server/http";
import { createProjectWithSetup } from "@/lib/server/projects";
import { listProjects } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ projects: await listProjects() });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, CreateProjectSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const project = await createProjectWithSetup(parsed.data);
    return ok({ project }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && /EACCES|EPERM/.test(err.message)) return fail("Dossier inaccessible (permissions).", 400);
    return handleError(err);
  }
}

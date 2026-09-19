import { TaskActionSchema } from "@/lib/domain/types";
import { applyAction } from "@/lib/server/actions";
import { handleError, ok, parseBody, type Params } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: Params<{ id: string }>) {
  const { id } = await params;
  const parsed = await parseBody(req, TaskActionSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const task = await applyAction(id, parsed.data);
    return ok({ task });
  } catch (err) {
    return handleError(err);
  }
}

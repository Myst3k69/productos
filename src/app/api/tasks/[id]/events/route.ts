import { handleError, ok, type Params } from "@/lib/server/http";
import { listEvents } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: Params<{ id: string }>) {
  const { id } = await params;
  const url = new URL(req.url);
  const after = Number(url.searchParams.get("after") ?? 0) || undefined;
  const limit = Number(url.searchParams.get("limit") ?? 500) || 500;
  try {
    return ok({ events: await listEvents(id, { after, limit }) });
  } catch (err) {
    return handleError(err);
  }
}

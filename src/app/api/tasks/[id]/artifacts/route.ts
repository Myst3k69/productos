import { handleError, ok, type Params } from "@/lib/server/http";
import { listArtifacts } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: Params<{ id: string }>) {
  const { id } = await params;
  const withContent = new URL(req.url).searchParams.get("content") === "1";
  try {
    return ok({ artifacts: await listArtifacts(id, withContent) });
  } catch (err) {
    return handleError(err);
  }
}

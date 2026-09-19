import { computeAIStatus } from "@/lib/server/engine";
import { handleError, ok } from "@/lib/server/http";
import { runner } from "@/lib/server/runner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ ai: await computeAIStatus(runner().status()) });
  } catch (err) {
    return handleError(err);
  }
}

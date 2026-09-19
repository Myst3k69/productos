import { UpdateSettingsSchema } from "@/lib/domain/types";
import { publishAIStatus } from "@/lib/server/engine";
import { handleError, ok, parseBody } from "@/lib/server/http";
import { runner } from "@/lib/server/runner";
import { getSettings, updateSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ settings: await getSettings() });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request) {
  const parsed = await parseBody(req, UpdateSettingsSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const settings = await updateSettings(parsed.data);
    const ai = await publishAIStatus(runner().status());
    return ok({ settings, ai });
  } catch (err) {
    return handleError(err);
  }
}

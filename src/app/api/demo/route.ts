import { seedDemo } from "@/lib/server/demo";
import { handleError, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const r = await seedDemo();
    return ok(r, { status: r.created ? 201 : 200 });
  } catch (err) {
    return handleError(err);
  }
}

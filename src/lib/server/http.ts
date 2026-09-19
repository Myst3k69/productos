import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { ActionError } from "./actions";
import { ProjectSetupError } from "./projects";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { error: ReturnType<typeof fail> }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: fail("Corps de requête JSON invalide.") };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { error: fail("Données invalides.", 422, { issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }) };
  }
  return { data: parsed.data };
}

export function handleError(err: unknown) {
  if (err instanceof ActionError) return fail(err.message, err.status);
  if (err instanceof ProjectSetupError) return fail(err.message, 400);
  const message = err instanceof Error ? err.message : String(err);
  console.error("[api]", err);
  return fail(message, 500);
}

export type Params<T extends Record<string, string>> = { params: Promise<T> };

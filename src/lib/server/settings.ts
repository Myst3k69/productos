import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/domain/types";
import { bus } from "./events";

const KEY = "app";

function envOverrides(): Partial<AppSettings> {
  const o: Partial<AppSettings> = {};
  const engine = process.env.ATELIER_ENGINE;
  if (engine === "claude" || engine === "mock") o.engine = engine;
  if (process.env.ATELIER_MODEL) o.model = process.env.ATELIER_MODEL;
  const effort = process.env.ATELIER_EFFORT as AppSettings["effort"] | undefined;
  if (effort && ["low", "medium", "high", "xhigh", "max"].includes(effort)) o.effort = effort;
  const c = Number(process.env.ATELIER_CONCURRENCY);
  if (Number.isFinite(c) && c >= 1) o.concurrency = Math.min(8, Math.floor(c));
  return o;
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY));
  const stored = (rows[0]?.value ?? {}) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...stored, ...envOverrides() };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY));
  const stored = (rows[0]?.value ?? {}) as Partial<AppSettings>;
  const next = { ...stored, ...patch };
  if (rows[0]) {
    await db.update(schema.settings).set({ value: next }).where(eq(schema.settings.key, KEY));
  } else {
    await db.insert(schema.settings).values({ key: KEY, value: next });
  }
  const merged = await getSettings();
  bus().publish({ type: "settings", settings: merged });
  return merged;
}

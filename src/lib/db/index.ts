import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type DB = LibSQLDatabase<typeof schema>;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  emoji TEXT NOT NULL DEFAULT '🛠️',
  kind TEXT NOT NULL DEFAULT 'mixed',
  workspace_path TEXT NOT NULL,
  repo_path TEXT,
  base_branch TEXT NOT NULL DEFAULT 'main',
  autonomy TEXT NOT NULL DEFAULT 'autopilot',
  integrations TEXT NOT NULL DEFAULT '{}',
  ai_model TEXT,
  ai_effort TEXT,
  context TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  spec TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  stage TEXT NOT NULL DEFAULT 'backlog',
  status TEXT NOT NULL DEFAULT 'idle',
  position REAL NOT NULL DEFAULT 0,
  autonomy TEXT,
  iteration INTEGER NOT NULL DEFAULT 0,
  refined_spec TEXT,
  plan TEXT,
  answers TEXT NOT NULL DEFAULT '[]',
  build_result TEXT,
  verify_result TEXT,
  review TEXT,
  integration TEXT,
  feedback TEXT NOT NULL DEFAULT '[]',
  error TEXT,
  branch TEXT,
  workspace_path TEXT,
  session_id TEXT,
  cost_usd REAL NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  ai_duration_ms INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  labels TEXT NOT NULL DEFAULT '[]',
  timings TEXT NOT NULL DEFAULT '{}',
  last_activity TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_stage_idx ON tasks(stage);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  stage TEXT,
  kind TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  data TEXT
);
CREATE INDEX IF NOT EXISTS events_task_idx ON events(task_id, id);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  path TEXT,
  url TEXT,
  mime TEXT,
  size INTEGER,
  content TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS artifacts_task_idx ON artifacts(task_id);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

type Global = typeof globalThis & {
  __atelierDb?: { client: Client; db: DB; ready: Promise<void> };
};

function dbUrl(): string {
  const url = process.env.ATELIER_DB ?? "file:./data/atelier.db";
  if (url.startsWith("file:")) {
    const p = url.slice(5);
    const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    return `file:${abs.replace(/\\/g, "/")}`;
  }
  return url;
}

function create() {
  const client = createClient({ url: dbUrl() });
  const db = drizzle(client, { schema });
  const ready = (async () => {
    try {
      await client.execute("PRAGMA journal_mode = WAL");
      await client.execute("PRAGMA busy_timeout = 5000");
    } catch {
      /* pragmas non critiques */
    }
    const statements = SCHEMA_SQL.split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) await client.execute(stmt);
  })();
  return { client, db, ready };
}

/** Base de données (singleton, survit au rechargement à chaud de Next). */
export async function getDb(): Promise<DB> {
  const g = globalThis as Global;
  if (!g.__atelierDb) g.__atelierDb = create();
  await g.__atelierDb.ready;
  return g.__atelierDb.db;
}

export { schema };

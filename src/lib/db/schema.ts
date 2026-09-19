import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  emoji: text("emoji").notNull().default("🛠️"),
  kind: text("kind").notNull().default("mixed"),
  workspacePath: text("workspace_path").notNull(),
  repoPath: text("repo_path"),
  baseBranch: text("base_branch").notNull().default("main"),
  autonomy: text("autonomy").notNull().default("autopilot"),
  integrations: text("integrations", { mode: "json" }).notNull().default("{}"),
  aiModel: text("ai_model"),
  aiEffort: text("ai_effort"),
  context: text("context"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    title: text("title").notNull(),
    spec: text("spec").notNull().default(""),
    type: text("type").notNull().default("other"),
    priority: text("priority").notNull().default("medium"),
    stage: text("stage").notNull().default("backlog"),
    status: text("status").notNull().default("idle"),
    position: real("position").notNull().default(0),
    autonomy: text("autonomy"),
    iteration: integer("iteration").notNull().default(0),
    refinedSpec: text("refined_spec", { mode: "json" }),
    plan: text("plan", { mode: "json" }),
    answers: text("answers", { mode: "json" }).notNull().default("[]"),
    buildResult: text("build_result", { mode: "json" }),
    verifyResult: text("verify_result", { mode: "json" }),
    review: text("review", { mode: "json" }),
    integration: text("integration", { mode: "json" }),
    feedback: text("feedback", { mode: "json" }).notNull().default("[]"),
    error: text("error"),
    branch: text("branch"),
    workspacePath: text("workspace_path"),
    sessionId: text("session_id"),
    costUsd: real("cost_usd").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    aiDurationMs: integer("ai_duration_ms").notNull().default(0),
    dueDate: text("due_date"),
    labels: text("labels", { mode: "json" }).notNull().default("[]"),
    timings: text("timings", { mode: "json" }).notNull().default("{}"),
    lastActivity: text("last_activity"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("tasks_project_idx").on(t.projectId), index("tasks_stage_idx").on(t.stage)],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: text("task_id").notNull(),
    projectId: text("project_id").notNull(),
    ts: text("ts").notNull(),
    stage: text("stage"),
    kind: text("kind").notNull(),
    message: text("message").notNull().default(""),
    data: text("data", { mode: "json" }),
  },
  (t) => [index("events_task_idx").on(t.taskId, t.id)],
);

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    path: text("path"),
    url: text("url"),
    mime: text("mime"),
    size: integer("size"),
    content: text("content"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("artifacts_task_idx").on(t.taskId)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type ArtifactRow = typeof artifacts.$inferSelect;

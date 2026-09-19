import { query, AbortError, type Options, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import {
  BuildResultSchema,
  PlanSchema,
  RefinedSpecSchema,
  VerifyResultSchema,
  type BuildResult,
  type Plan,
  type RefinedSpec,
  type VerifyResult,
} from "@/lib/domain/types";
import { EngineAbortError, EngineAuthError, type AIEngine, type EngineContext, type ProbeResult } from "./types";
import { buildPrompt, clarifyPrompt, planPrompt, rebuildPrompt, systemAppend, verifyPrompt } from "./prompts";

const READ_ONLY_TOOLS = ["Read", "Glob", "Grep"];

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}… (${s.length - n} caractères tronqués)`;
}

/** Résumé lisible d'un appel d'outil (affiché sur la carte et dans l'activité). */
export function describeToolUse(name: string, input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof i[k] === "string" ? (i[k] as string) : "");
  switch (name) {
    case "Read":
      return `Lit ${str("file_path")}`;
    case "Write":
      return `Écrit ${str("file_path")}`;
    case "Edit":
    case "MultiEdit":
      return `Modifie ${str("file_path")}`;
    case "Bash":
      return `Exécute : ${truncate(str("command").replace(/\s+/g, " "), 120)}`;
    case "Glob":
      return `Cherche des fichiers ${str("pattern")}`;
    case "Grep":
      return `Recherche « ${truncate(str("pattern"), 60)} »`;
    case "WebSearch":
      return `Recherche web : ${truncate(str("query"), 80)}`;
    case "WebFetch":
      return `Consulte ${truncate(str("url"), 80)}`;
    case "Task":
    case "Agent":
      return `Délègue : ${truncate(str("description") || str("prompt"), 80)}`;
    case "TodoWrite":
      return "Met à jour sa liste d'étapes";
    case "StructuredOutput":
      return "Rédige le résultat structuré";
    default:
      return `Outil ${name}`;
  }
}

function subprocessEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  // Ne pas hériter des marqueurs d'une session Claude Code parente.
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  env.CLAUDE_AGENT_SDK_CLIENT_APP = "atelier/0.1.0";
  return env;
}

interface RunOptions {
  prompt: string;
  schema?: Record<string, unknown>;
  tools?: string[] | { type: "preset"; preset: "claude_code" };
  disallowedTools?: string[];
  maxTurns: number;
  maxBudgetUsd?: number;
  resume?: string;
  cwd: string;
}

interface RunOutcome {
  structured: unknown;
  text: string;
  sessionId: string | null;
}

export class ClaudeEngine implements AIEngine {
  readonly id = "claude" as const;

  private async run(ctx: EngineContext, opts: RunOptions): Promise<RunOutcome> {
    const ac = new AbortController();
    const onAbort = () => ac.abort();
    if (ctx.signal.aborted) throw new EngineAbortError();
    ctx.signal.addEventListener("abort", onAbort, { once: true });

    const model = ctx.project.aiModel && ctx.project.aiModel !== "mock" ? ctx.project.aiModel : ctx.settings.model;
    const effort = (ctx.project.aiEffort ?? ctx.settings.effort) as Options["effort"];

    const options: Options = {
      cwd: opts.cwd,
      abortController: ac,
      env: subprocessEnv(),
      model,
      effort,
      maxTurns: opts.maxTurns,
      maxBudgetUsd: opts.maxBudgetUsd,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      permissionPrompts: "none",
      settingSources: ["project"],
      systemPrompt: { type: "preset", preset: "claude_code", append: systemAppend(ctx), snapshot: true },
      tools: opts.tools,
      disallowedTools: opts.disallowedTools,
      outputFormat: opts.schema ? { type: "json_schema", schema: opts.schema } : undefined,
      resume: opts.resume,
    };

    let structured: unknown = undefined;
    let text = "";
    let sessionId: string | null = null;
    const started = Date.now();

    try {
      for await (const msg of query({ prompt: opts.prompt, options })) {
        await this.handle(ctx, msg, (m) => {
          if (m.type === "result") {
            if (m.subtype === "success") {
              structured = m.structured_output;
              text = m.result;
            }
          }
        });
        if (msg.type === "system" && msg.subtype === "init") sessionId = msg.session_id;
        if (msg.type === "result") {
          sessionId = msg.session_id ?? sessionId;
          await ctx.addUsage({
            costUsd: msg.total_cost_usd,
            inputTokens: msg.usage?.input_tokens ?? 0,
            outputTokens: msg.usage?.output_tokens ?? 0,
            durationMs: msg.duration_ms ?? Date.now() - started,
          });
          if (msg.subtype !== "success") {
            const detail = msg.errors?.join("; ") || msg.subtype;
            if (msg.subtype === "error_max_turns") throw new Error(`L'IA a atteint la limite de tours (${opts.maxTurns}). ${detail}`);
            if (msg.subtype === "error_max_budget_usd") throw new Error(`Budget par tâche dépassé (${opts.maxBudgetUsd} $).`);
            if (msg.subtype === "error_max_structured_output_retries") throw new Error("L'IA n'a pas réussi à produire un résultat structuré valide.");
            throw new Error(`Erreur pendant l'exécution : ${detail}`);
          }
          if (msg.is_error) {
            const t = msg.result || "erreur inconnue";
            if (msg.api_error_status === 401 || /authenticat|OAuth|log ?in/i.test(t)) throw new EngineAuthError(t);
            throw new Error(t);
          }
        }
      }
    } catch (err) {
      if (err instanceof AbortError || ac.signal.aborted || ctx.signal.aborted) throw new EngineAbortError();
      if (err instanceof EngineAuthError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      if (/authenticat|OAuth access token|not logged in|ANTHROPIC_API_KEY/i.test(message)) throw new EngineAuthError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      ctx.signal.removeEventListener("abort", onAbort);
    }

    return { structured, text, sessionId };
  }

  /** Transforme le flux du SDK en événements Atelier. */
  private async handle(ctx: EngineContext, msg: SDKMessage, onResult: (m: SDKMessage) => void): Promise<void> {
    switch (msg.type) {
      case "system": {
        if (msg.subtype === "init") {
          await ctx.emit("system", `Session IA démarrée · ${msg.model}`, {
            model: msg.model,
            sessionId: msg.session_id,
            tools: msg.tools?.length ?? 0,
          });
          await ctx.patch({ sessionId: msg.session_id, lastActivity: "Démarrage de la session IA" });
        }
        return;
      }
      case "auth_status": {
        if (msg.error) throw new EngineAuthError(msg.error);
        return;
      }
      case "assistant": {
        if (msg.error === "authentication_failed" || msg.error === "oauth_org_not_allowed") {
          throw new EngineAuthError("Authentification Claude refusée. Reconnectez le moteur dans les réglages.");
        }
        if (msg.error === "billing_error" || msg.error === "account_on_hold") {
          throw new EngineAuthError("Compte Anthropic indisponible (facturation). Vérifiez votre compte.");
        }
        if (msg.parent_tool_use_id) return; // sous-agents : on ne journalise que l'agent principal
        for (const block of msg.message.content) {
          if (block.type === "text" && block.text.trim()) {
            await ctx.emit("text", truncate(block.text, 6000));
            await ctx.patch({ lastActivity: truncate(block.text.replace(/\s+/g, " ").trim(), 140) });
          } else if (block.type === "thinking" && "thinking" in block && typeof block.thinking === "string" && block.thinking.trim()) {
            await ctx.emit("thinking", truncate(block.thinking, 2000));
          } else if (block.type === "tool_use") {
            const label = describeToolUse(block.name, block.input);
            await ctx.emit("tool_use", label, {
              tool: block.name,
              id: block.id,
              input: safeInput(block.input),
            });
            await ctx.patch({ lastActivity: label });
          }
        }
        return;
      }
      case "user": {
        if (msg.parent_tool_use_id) return;
        const content = msg.message.content;
        if (typeof content === "string") return;
        for (const block of content) {
          if (block.type === "tool_result") {
            const raw = typeof block.content === "string"
              ? block.content
              : Array.isArray(block.content)
                ? block.content.map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n")
                : "";
            const isError = block.is_error === true;
            await ctx.emit("tool_result", truncate(raw.trim(), isError ? 1500 : 400), {
              toolUseId: block.tool_use_id,
              isError,
              length: raw.length,
            });
          }
        }
        return;
      }
      case "result": {
        onResult(msg);
        return;
      }
      default:
        return;
    }
  }

  /* ─────────────────────────── Étapes ─────────────────────────── */

  async clarify(ctx: EngineContext): Promise<RefinedSpec> {
    const out = await this.run(ctx, {
      prompt: clarifyPrompt(ctx),
      schema: z.toJSONSchema(RefinedSpecSchema, { target: "draft-7" }) as Record<string, unknown>,
      tools: READ_ONLY_TOOLS,
      maxTurns: 20,
      maxBudgetUsd: Math.min(2, ctx.settings.maxBudgetUsdPerTask),
      cwd: ctx.workspace.path,
    });
    return parseOrThrow(RefinedSpecSchema, out.structured, "cadrage");
  }

  async plan(ctx: EngineContext): Promise<Plan> {
    const out = await this.run(ctx, {
      prompt: planPrompt(ctx),
      schema: z.toJSONSchema(PlanSchema, { target: "draft-7" }) as Record<string, unknown>,
      tools: READ_ONLY_TOOLS,
      maxTurns: 30,
      maxBudgetUsd: Math.min(3, ctx.settings.maxBudgetUsdPerTask),
      cwd: ctx.workspace.path,
    });
    const plan = parseOrThrow(PlanSchema, out.structured, "plan");
    plan.steps = plan.steps.map((s, i) => ({ ...s, id: s.id || `s${i + 1}`, status: "pending" }));
    return plan;
  }

  async build(ctx: EngineContext): Promise<BuildResult> {
    const canResume = Boolean(ctx.task.sessionId && ctx.task.iteration > 0 && ctx.task.feedback.length);
    const schema = z.toJSONSchema(BuildResultSchema, { target: "draft-7" }) as Record<string, unknown>;
    const base = {
      schema,
      tools: { type: "preset" as const, preset: "claude_code" as const },
      maxTurns: 200,
      maxBudgetUsd: ctx.settings.maxBudgetUsdPerTask,
      cwd: ctx.workspace.path,
    };
    let out: RunOutcome;
    if (canResume) {
      try {
        out = await this.run(ctx, { ...base, prompt: rebuildPrompt(ctx), resume: ctx.task.sessionId! });
      } catch (err) {
        if (err instanceof EngineAbortError || err instanceof EngineAuthError) throw err;
        await ctx.emit("system", "Reprise de session impossible, nouvelle session.", { reason: String(err) });
        out = await this.run(ctx, { ...base, prompt: buildPrompt(ctx) });
      }
    } else {
      out = await this.run(ctx, { ...base, prompt: buildPrompt(ctx) });
    }
    const result = parseOrThrow(BuildResultSchema, out.structured ?? { summary: out.text || "Travail terminé.", changes: [], notes: [] }, "fabrication");
    return result;
  }

  async verify(ctx: EngineContext): Promise<VerifyResult> {
    const out = await this.run(ctx, {
      prompt: verifyPrompt(ctx),
      schema: z.toJSONSchema(VerifyResultSchema, { target: "draft-7" }) as Record<string, unknown>,
      tools: { type: "preset", preset: "claude_code" },
      disallowedTools: ["Write", "Edit", "MultiEdit", "NotebookEdit"],
      maxTurns: 60,
      maxBudgetUsd: Math.min(4, ctx.settings.maxBudgetUsdPerTask),
      cwd: ctx.workspace.path,
    });
    return parseOrThrow(VerifyResultSchema, out.structured, "contrôle");
  }

  async probe(): Promise<ProbeResult> {
    const started = Date.now();
    try {
      let model: string | undefined;
      let text = "";
      for await (const msg of query({
        prompt: "Réponds uniquement par le mot OK.",
        options: {
          env: subprocessEnv(),
          maxTurns: 1,
          tools: [],
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
          permissionPrompts: "none",
          settingSources: [],
          persistSession: false,
        },
      })) {
        if (msg.type === "system" && msg.subtype === "init") model = msg.model;
        if (msg.type === "auth_status" && msg.error) return { ok: false, detail: msg.error };
        if (msg.type === "result") {
          if (msg.subtype === "success" && !msg.is_error) text = msg.result;
          else return { ok: false, detail: msg.subtype === "success" ? msg.result : msg.errors?.join("; ") || msg.subtype };
        }
      }
      return { ok: true, detail: `Réponse : ${text.slice(0, 40)}`, model, latencyMs: Date.now() - started };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : String(err) };
    }
  }
}

function safeInput(input: unknown): Record<string, unknown> {
  try {
    const s = JSON.stringify(input ?? {});
    return s.length > 4000 ? { truncated: `${s.slice(0, 4000)}…` } : (JSON.parse(s) as Record<string, unknown>);
  } catch {
    return {};
  }
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, stage: string): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Error(`Résultat de l'étape « ${stage} » invalide : ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(", ")}`);
}

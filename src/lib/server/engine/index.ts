import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AIStatus, AppSettings, Project } from "@/lib/domain/types";
import { bus } from "../events";
import { totalCost } from "../repo";
import { getSettings } from "../settings";
import { ClaudeEngine } from "./claude";
import { MockEngine } from "./mock";
import type { AIEngine } from "./types";

type Global = typeof globalThis & {
  __atelierEngines?: { claude: ClaudeEngine; mock: MockEngine; unavailableReason: string | null; lastProbe: string | null };
};

function state() {
  const g = globalThis as Global;
  if (!g.__atelierEngines) {
    g.__atelierEngines = { claude: new ClaudeEngine(), mock: new MockEngine(), unavailableReason: null, lastProbe: null };
  }
  return g.__atelierEngines;
}

export interface AuthDetection {
  available: boolean;
  method: AIStatus["authMethod"];
  detail: string;
}

/** Détecte comment le moteur Claude peut s'authentifier, sans appel réseau. */
export async function detectClaudeAuth(): Promise<AuthDetection> {
  if (process.env.ANTHROPIC_API_KEY) {
    return { available: true, method: "api_key", detail: "Clé API Anthropic (ANTHROPIC_API_KEY)." };
  }
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { available: true, method: "oauth_token", detail: "Jeton d'abonnement Claude (CLAUDE_CODE_OAUTH_TOKEN)." };
  }
  const credPath = path.join(os.homedir(), ".claude", ".credentials.json");
  try {
    const raw = await fs.readFile(credPath, "utf8");
    const json = JSON.parse(raw) as { claudeAiOauth?: { accessToken?: string; expiresAt?: number; refreshToken?: string; subscriptionType?: string } };
    const oauth = json.claudeAiOauth;
    if (oauth?.accessToken) {
      const expiresAt = oauth.expiresAt ?? 0;
      if (expiresAt > Date.now()) {
        return { available: true, method: "claude_login", detail: `Session Claude Code connectée (${oauth.subscriptionType ?? "abonnement"}).` };
      }
      if (oauth.refreshToken) {
        return { available: true, method: "claude_login", detail: "Session Claude Code (jeton à rafraîchir automatiquement)." };
      }
      return { available: false, method: "none", detail: "Session Claude Code expirée : ouvrez un terminal, lancez `claude` puis `/login`." };
    }
  } catch {
    /* pas de fichier : peut-être le trousseau (macOS) */
  }
  if (process.platform === "darwin") {
    return { available: true, method: "claude_login", detail: "Session Claude Code (trousseau macOS) — sera vérifiée au premier appel." };
  }
  return {
    available: false,
    method: "none",
    detail: "Aucune connexion : ajoutez ANTHROPIC_API_KEY dans .env.local, ou lancez `claude` puis `/login`, ou `claude setup-token`.",
  };
}

/** Le moteur Claude a-t-il été déclaré indisponible à l'exécution (auth) ? */
export function markEngineUnavailable(reason: string | null): void {
  state().unavailableReason = reason;
  void publishAIStatus();
}

export async function resolveEngineId(settings: AppSettings, project?: Pick<Project, "aiModel"> | null): Promise<"claude" | "mock"> {
  if (project?.aiModel === "mock") return "mock";
  if (settings.engine === "mock") return "mock";
  if (settings.engine === "claude") return "claude";
  const auth = await detectClaudeAuth();
  if (!auth.available) return "mock";
  if (state().unavailableReason) return "mock";
  return "claude";
}

export async function getEngine(settings: AppSettings, project?: Pick<Project, "aiModel"> | null): Promise<AIEngine> {
  const id = await resolveEngineId(settings, project);
  return id === "claude" ? state().claude : state().mock;
}

export function getEngineById(id: "claude" | "mock"): AIEngine {
  return id === "claude" ? state().claude : state().mock;
}

export async function computeAIStatus(runner?: { running: string[]; queued: string[] }): Promise<AIStatus> {
  const settings = await getSettings();
  const auth = await detectClaudeAuth();
  const s = state();
  const engine = await resolveEngineId(settings);
  let detail = auth.detail;
  if (settings.engine === "mock") detail = "Mode démo forcé dans les réglages.";
  else if (s.unavailableReason) detail = `Moteur Claude indisponible : ${s.unavailableReason}`;
  return {
    engine,
    available: engine === "claude" ? auth.available && !s.unavailableReason : true,
    authMethod: auth.method,
    detail,
    model: settings.model,
    effort: settings.effort,
    running: runner?.running ?? [],
    queued: runner?.queued ?? [],
    concurrency: settings.concurrency,
    totalCostUsd: await totalCost(),
  };
}

export async function publishAIStatus(runner?: { running: string[]; queued: string[] }): Promise<AIStatus> {
  const status = await computeAIStatus(runner);
  bus().publish({ type: "ai.status", status });
  return status;
}

/** Teste réellement la connexion au moteur Claude (petit appel). */
export async function probeClaude(): Promise<{ ok: boolean; detail: string; model?: string; latencyMs?: number }> {
  const r = await state().claude.probe();
  state().lastProbe = new Date().toISOString();
  if (r.ok) markEngineUnavailable(null);
  else markEngineUnavailable(r.detail);
  return r;
}

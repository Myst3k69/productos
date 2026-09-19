import fs from "node:fs/promises";
import path from "node:path";
import type { CreateProjectInput, Project, UpdateProjectInput } from "@/lib/domain/types";
import { createProject, updateProject } from "./repo";
import { currentBranch, ensureRepo, exists, isGitRepo } from "./workspace";

export class ProjectSetupError extends Error {}

function normalizePath(p: string): string {
  const trimmed = p.trim().replace(/^["']|["']$/g, "");
  return path.resolve(trimmed);
}

/** Crée le projet et prépare son espace de travail (dossier, dépôt git). */
export async function createProjectWithSetup(input: CreateProjectInput): Promise<Project> {
  const workspacePath = normalizePath(input.workspacePath);
  await fs.mkdir(workspacePath, { recursive: true });

  let repoPath: string | null = input.repoPath ? normalizePath(input.repoPath) : null;
  let baseBranch = input.baseBranch || "main";

  if (input.kind !== "content") {
    const candidate = repoPath ?? workspacePath;
    if (await isGitRepo(candidate)) {
      repoPath = candidate;
      baseBranch = (await currentBranch(candidate)) ?? baseBranch;
      if (baseBranch === "HEAD") baseBranch = input.baseBranch || "main";
    } else if (input.initGit) {
      const r = await ensureRepo(candidate, baseBranch);
      repoPath = r.root;
      baseBranch = r.baseBranch;
    } else {
      repoPath = null;
    }
  } else {
    repoPath = repoPath && (await isGitRepo(repoPath)) ? repoPath : null;
  }

  const folder = path.join(workspacePath, input.integrations?.folder?.subdir ?? "livrables");
  await fs.mkdir(folder, { recursive: true });

  return createProject({ ...input, workspacePath, repoPath, baseBranch });
}

export async function updateProjectWithSetup(id: string, patch: UpdateProjectInput): Promise<Project | null> {
  const next: UpdateProjectInput = { ...patch };
  if (next.workspacePath) {
    next.workspacePath = normalizePath(next.workspacePath);
    await fs.mkdir(next.workspacePath, { recursive: true });
  }
  if (next.repoPath) {
    next.repoPath = normalizePath(next.repoPath);
    if (!(await isGitRepo(next.repoPath))) {
      if (next.initGit ?? true) {
        const r = await ensureRepo(next.repoPath, next.baseBranch ?? "main");
        next.repoPath = r.root;
        next.baseBranch = r.baseBranch;
      } else {
        throw new ProjectSetupError(`« ${next.repoPath} » n'est pas un dépôt git.`);
      }
    }
  }
  return updateProject(id, next);
}

export interface PathInfo {
  path: string;
  exists: boolean;
  isDir: boolean;
  isGit: boolean;
  branch: string | null;
  entries: number;
}

export async function inspectPath(p: string): Promise<PathInfo> {
  const abs = normalizePath(p);
  const ex = await exists(abs);
  let isDir = false;
  let entries = 0;
  if (ex) {
    const st = await fs.stat(abs);
    isDir = st.isDirectory();
    if (isDir) entries = (await fs.readdir(abs)).length;
  }
  const git = ex && isDir ? await isGitRepo(abs) : false;
  return { path: abs, exists: ex, isDir, isGit: git, branch: git ? await currentBranch(abs) : null, entries };
}

export function suggestedWorkspace(name: string): string {
  const base = process.env.ATELIER_WORKSPACES ?? path.join(process.cwd(), "workspaces");
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return path.join(base, slug || "projet");
}

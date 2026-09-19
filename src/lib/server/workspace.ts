import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type { Project, Task } from "@/lib/domain/types";
import { TASK_TYPE_META } from "@/lib/domain/types";
import { slugify } from "@/lib/domain/helpers";
import type { WorkspaceInfo } from "./engine/types";

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

/** Exécute un binaire (git, gh, npm…) sans shell, avec cwd. Ne lève jamais. */
export async function run(cmd: string, args: string[], cwd: string, opts: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      timeout: opts.timeoutMs ?? 120_000,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
      env: opts.env ?? process.env,
    });
    return { stdout: String(stdout), stderr: String(stderr), code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number | string; message?: string };
    return {
      stdout: String(e.stdout ?? ""),
      stderr: String(e.stderr ?? e.message ?? ""),
      code: typeof e.code === "number" ? e.code : 1,
    };
  }
}

export const git = (args: string[], cwd: string, opts?: { timeoutMs?: number }) => run("git", args, cwd, opts);

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function isGitRepo(dir: string): Promise<boolean> {
  if (!(await exists(dir))) return false;
  const r = await git(["rev-parse", "--is-inside-work-tree"], dir);
  return r.code === 0 && r.stdout.trim() === "true";
}

export async function gitRoot(dir: string): Promise<string | null> {
  const r = await git(["rev-parse", "--show-toplevel"], dir);
  return r.code === 0 ? path.normalize(r.stdout.trim()) : null;
}

export async function currentBranch(dir: string): Promise<string | null> {
  const r = await git(["rev-parse", "--abbrev-ref", "HEAD"], dir);
  return r.code === 0 ? r.stdout.trim() : null;
}

export async function hasCommits(dir: string): Promise<boolean> {
  const r = await git(["rev-parse", "--verify", "HEAD"], dir);
  return r.code === 0;
}

export async function hasRemote(dir: string): Promise<boolean> {
  const r = await git(["remote"], dir);
  return r.code === 0 && r.stdout.trim().length > 0;
}

export async function ghAvailable(): Promise<boolean> {
  const r = await run("gh", ["--version"], process.cwd(), { timeoutMs: 10_000 });
  return r.code === 0;
}

/** Ajoute `.atelier/` aux exclusions locales du dépôt (sans toucher au .gitignore versionné). */
async function excludeAtelierDir(repoRoot: string): Promise<void> {
  const gitDirRes = await git(["rev-parse", "--git-common-dir"], repoRoot);
  if (gitDirRes.code !== 0) return;
  const gitDir = path.resolve(repoRoot, gitDirRes.stdout.trim());
  const excludePath = path.join(gitDir, "info", "exclude");
  try {
    await fs.mkdir(path.dirname(excludePath), { recursive: true });
    const current = (await exists(excludePath)) ? await fs.readFile(excludePath, "utf8") : "";
    if (!current.split(/\r?\n/).includes(".atelier/")) {
      await fs.writeFile(excludePath, `${current.trimEnd()}\n.atelier/\n`, "utf8");
    }
  } catch {
    /* non bloquant */
  }
}

/**
 * S'assure qu'un dépôt git exploitable existe dans `dir` :
 * initialisation, premier commit, branche de base, exclusion de `.atelier/`.
 */
export async function ensureRepo(dir: string, baseBranch: string): Promise<{ root: string; baseBranch: string }> {
  await fs.mkdir(dir, { recursive: true });
  if (!(await isGitRepo(dir))) {
    const init = await git(["init", "-b", baseBranch], dir);
    if (init.code !== 0) {
      // git < 2.28 : pas d'option -b
      const legacy = await git(["init"], dir);
      if (legacy.code !== 0) throw new Error(`git init a échoué : ${legacy.stderr}`);
      await git(["checkout", "-b", baseBranch], dir);
    }
  }
  const root = (await gitRoot(dir)) ?? dir;
  if (!(await hasCommits(root))) {
    await git(["config", "user.email"], root).then(async (r) => {
      if (r.code !== 0 || !r.stdout.trim()) {
        await git(["config", "user.email", "atelier@local"], root);
        await git(["config", "user.name", "Atelier"], root);
      }
    });
    const c = await git(["commit", "--allow-empty", "-m", "chore: initialisation du dépôt (Atelier)"], root);
    if (c.code !== 0) throw new Error(`Premier commit impossible : ${c.stderr}`);
  }
  const branch = (await currentBranch(root)) ?? baseBranch;
  await excludeAtelierDir(root);
  return { root, baseBranch: branch === "HEAD" ? baseBranch : branch };
}

/** Une tâche va-t-elle dans le dépôt ou dans un dossier de livrables ? */
export function destinationFor(task: Pick<Task, "type">, project: Pick<Project, "repoPath" | "kind">): "repo" | "folder" {
  if (!project.repoPath) return "folder";
  if (TASK_TYPE_META[task.type].destination === "repo") return "repo";
  if (project.kind === "code") return "repo";
  return "folder";
}

export function branchNameFor(task: Pick<Task, "id" | "title">): string {
  return `atelier/${slugify(task.title)}-${task.id.slice(0, 5).toLowerCase()}`;
}

/**
 * Prépare l'espace de travail d'une tâche :
 *  - repo   → worktree git isolé sur une branche dédiée (`.atelier/worktrees/<slug>`)
 *  - folder → dossier de staging (`.atelier/staging/<slug>`) copié vers `livrables/` à l'intégration
 */
export async function prepareWorkspace(task: Task, project: Project): Promise<WorkspaceInfo> {
  const dest = destinationFor(task, project);
  const slug = `${slugify(task.title)}-${task.id.slice(0, 5).toLowerCase()}`;

  if (dest === "repo") {
    const { root, baseBranch } = await ensureRepo(project.repoPath!, project.baseBranch);
    const branch = task.branch ?? branchNameFor(task);
    const wtPath = task.workspacePath ?? path.join(root, ".atelier", "worktrees", slug);
    await fs.mkdir(path.dirname(wtPath), { recursive: true });

    const alreadyWorktree = await isGitRepo(wtPath);
    if (!alreadyWorktree) {
      // Nettoie un éventuel worktree fantôme du même chemin
      await git(["worktree", "prune"], root);
      const branchExists = (await git(["rev-parse", "--verify", `refs/heads/${branch}`], root)).code === 0;
      const add = branchExists
        ? await git(["worktree", "add", wtPath, branch], root)
        : await git(["worktree", "add", "-b", branch, wtPath, baseBranch], root);
      if (add.code !== 0) throw new Error(`Impossible de créer le worktree : ${add.stderr || add.stdout}`);
    }
    return { kind: "repo", path: wtPath, repoRoot: root, branch, baseBranch };
  }

  const stagingRoot = path.join(project.workspacePath, ".atelier", "staging");
  const stagePath = task.workspacePath ?? path.join(stagingRoot, slug);
  await fs.mkdir(stagePath, { recursive: true });
  const targetDir = path.join(project.workspacePath, project.integrations.folder.subdir, slug);
  return { kind: "folder", path: stagePath, targetDir };
}

/** Commit de tout le worktree. Retourne le hash ou null s'il n'y a rien à committer. */
export async function commitAll(worktree: string, message: string): Promise<string | null> {
  await git(["add", "-A"], worktree);
  const status = await git(["status", "--porcelain"], worktree);
  if (status.code === 0 && !status.stdout.trim()) return null;
  const emailRes = await git(["config", "user.email"], worktree);
  if (emailRes.code !== 0 || !emailRes.stdout.trim()) {
    await git(["config", "user.email", "atelier@local"], worktree);
    await git(["config", "user.name", "Atelier"], worktree);
  }
  const c = await git(["commit", "-m", message, "--no-verify"], worktree);
  if (c.code !== 0) throw new Error(`Commit impossible : ${c.stderr || c.stdout}`);
  const h = await git(["rev-parse", "--short", "HEAD"], worktree);
  return h.code === 0 ? h.stdout.trim() : null;
}

export async function diffAgainstBase(repoRoot: string, baseBranch: string, branch: string): Promise<string> {
  const r = await git(["diff", "--no-color", `${baseBranch}...${branch}`], repoRoot);
  if (r.code === 0) return r.stdout;
  // Repli : diff simple (branche déjà fusionnée ou base différente)
  const r2 = await git(["diff", "--no-color", baseBranch, branch], repoRoot);
  return r2.code === 0 ? r2.stdout : "";
}

export interface ChangedFile {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
}

export async function changedFiles(repoRoot: string, baseBranch: string, branch: string): Promise<ChangedFile[]> {
  const r = await git(["diff", "--name-status", `${baseBranch}...${branch}`], repoRoot);
  if (r.code !== 0) return [];
  return r.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [code, ...rest] = line.split("\t");
      const status = code.startsWith("A") ? "added" : code.startsWith("D") ? "deleted" : code.startsWith("R") ? "renamed" : "modified";
      return { path: rest[rest.length - 1], status } as ChangedFile;
    });
}

export async function diffStat(repoRoot: string, baseBranch: string, branch: string): Promise<{ files: number; insertions: number; deletions: number }> {
  const r = await git(["diff", "--shortstat", `${baseBranch}...${branch}`], repoRoot);
  const m = r.stdout.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
  return { files: Number(m?.[1] ?? 0), insertions: Number(m?.[2] ?? 0), deletions: Number(m?.[3] ?? 0) };
}

export async function removeWorktree(repoRoot: string, wtPath: string): Promise<void> {
  await git(["worktree", "remove", "--force", wtPath], repoRoot);
  await git(["worktree", "prune"], repoRoot);
}

export async function mergeBranch(repoRoot: string, baseBranch: string, branch: string, message: string): Promise<ExecResult> {
  const cur = await currentBranch(repoRoot);
  if (cur !== baseBranch) {
    const co = await git(["checkout", baseBranch], repoRoot);
    if (co.code !== 0) return co;
  }
  return git(["merge", "--no-ff", branch, "-m", message], repoRoot);
}

export async function abortMerge(repoRoot: string): Promise<void> {
  await git(["merge", "--abort"], repoRoot);
}

export async function pushBranch(repoRoot: string, branch: string): Promise<ExecResult> {
  return git(["push", "-u", "origin", branch], repoRoot, { timeoutMs: 180_000 });
}

export async function createPullRequest(
  repoRoot: string,
  opts: { title: string; body: string; base: string; head: string; draft?: boolean },
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const args = ["pr", "create", "--title", opts.title, "--body", opts.body, "--base", opts.base, "--head", opts.head];
  if (opts.draft) args.push("--draft");
  const r = await run("gh", args, repoRoot, { timeoutMs: 120_000 });
  if (r.code !== 0) return { ok: false, error: r.stderr || r.stdout };
  const url = (r.stdout.match(/https?:\/\/\S+/) ?? [])[0];
  return { ok: true, url };
}

/* ───────────────────────── Fichiers (dossiers) ──────────────────────── */

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".atelier", "dist", "build", "__pycache__", ".venv", "venv"]);

export async function listFilesRecursive(dir: string, max = 500): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string, rel: string) {
    if (out.length >= max) return;
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= max) return;
      if (SKIP_DIRS.has(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(path.join(d, e.name), r);
      else out.push(r);
    }
  }
  await walk(dir, "");
  return out;
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  await fs.cp(src, dest, { recursive: true, force: true });
}

export async function removeDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

const TEXT_EXT = new Set([
  ".md", ".mdx", ".txt", ".json", ".yaml", ".yml", ".toml", ".csv", ".tsv", ".html", ".htm", ".css", ".scss",
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".rb", ".go", ".rs", ".java", ".kt", ".swift", ".sh",
  ".ps1", ".sql", ".xml", ".svg", ".env", ".ini", ".cfg", ".conf", ".gitignore", ".prisma", ".graphql", ".vue", ".svelte",
]);

export function isTextFile(p: string): boolean {
  const ext = path.extname(p).toLowerCase();
  if (TEXT_EXT.has(ext)) return true;
  const base = path.basename(p).toLowerCase();
  return ["dockerfile", "makefile", "readme", "license", ".gitignore", ".env.example"].includes(base);
}

export function mimeFor(p: string): string {
  const ext = path.extname(p).toLowerCase();
  const map: Record<string, string> = {
    ".md": "text/markdown", ".mdx": "text/markdown", ".txt": "text/plain", ".json": "application/json",
    ".html": "text/html", ".htm": "text/html", ".css": "text/css", ".js": "text/javascript", ".ts": "text/typescript",
    ".tsx": "text/typescript", ".jsx": "text/javascript", ".py": "text/x-python", ".csv": "text/csv", ".svg": "image/svg+xml",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
    ".pdf": "application/pdf", ".yaml": "text/yaml", ".yml": "text/yaml", ".sql": "text/x-sql", ".xml": "text/xml",
  };
  return map[ext] ?? "application/octet-stream";
}

export async function readTextCapped(p: string, cap = 200_000): Promise<{ content: string; size: number; truncated: boolean }> {
  const stat = await fs.stat(p);
  const fh = await fs.open(p, "r");
  try {
    const len = Math.min(stat.size, cap);
    const buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, 0);
    return { content: buf.toString("utf8"), size: stat.size, truncated: stat.size > cap };
  } finally {
    await fh.close();
  }
}

export function tempId(): string {
  return nanoid(6).toLowerCase();
}

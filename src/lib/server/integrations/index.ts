import path from "node:path";
import type { IntegrationResult } from "@/lib/domain/types";
import type { EngineContext } from "../engine/types";
import { addArtifact } from "../repo";
import {
  abortMerge,
  changedFiles,
  commitAll,
  copyDir,
  createPullRequest,
  diffStat,
  ghAvailable,
  hasRemote,
  listFilesRecursive,
  mergeBranch,
  pushBranch,
  removeDir,
  removeWorktree,
} from "../workspace";

function fileUrl(p: string): string {
  const norm = path.resolve(p).replace(/\\/g, "/");
  return `file:///${norm.replace(/^\//, "")}`;
}

/**
 * Intègre le résultat validé d'une tâche :
 *  - repo   → commit final, puis fusion / pull request / branche selon le projet
 *  - folder → copie du staging vers le dossier de livrables
 */
export async function integrate(ctx: EngineContext): Promise<IntegrationResult> {
  const { task, project, workspace: ws } = ctx;

  if (ws.kind === "repo") {
    const root = ws.repoRoot!;
    const branch = ws.branch!;
    const base = ws.baseBranch!;
    const mode = project.integrations.git.mode;
    const details: string[] = [];
    const links: IntegrationResult["links"] = [];

    await ctx.emit("integration", "Commit final des modifications", { step: "commit" });
    const hash = await commitAll(ws.path, `feat: ${task.title}\n\nTâche Atelier ${task.id} — validée par le fondateur.`);
    if (hash) details.push(`Commit ${hash}`);
    const stat = await diffStat(root, base, branch);
    const files = await changedFiles(root, base, branch);
    details.push(`${stat.files} fichier${stat.files > 1 ? "s" : ""}, +${stat.insertions} / -${stat.deletions}`);

    if (files.length === 0 && !hash) {
      await ctx.emit("integration", "Aucune modification à intégrer.", { step: "empty" });
      await removeWorktree(root, ws.path);
      return { kind: "none", summary: "Aucune modification détectée sur la branche : rien à intégrer.", links, details };
    }

    if (mode === "merge") {
      await ctx.emit("integration", `Fusion de ${branch} dans ${base}`, { step: "merge" });
      const m = await mergeBranch(root, base, branch, `Merge ${branch}: ${task.title} (Atelier)`);
      if (m.code !== 0) {
        await abortMerge(root);
        throw new Error(
          `La fusion dans « ${base} » a échoué (conflits ou modifications non commitées dans le dépôt principal). ` +
            `Résolvez manuellement : git merge ${branch} — ou passez le projet en mode « Pull request » / « Branche seule ». Détail : ${(m.stderr || m.stdout).trim().slice(0, 400)}`,
        );
      }
      await removeWorktree(root, ws.path);
      await addArtifact({ taskId: task.id, kind: "commit", title: `Fusionné dans ${base}`, content: hash, path: root });
      details.push(`Fusionné dans ${base} (--no-ff)`);
      if (project.integrations.git.autoPush && (await hasRemote(root))) {
        await ctx.emit("integration", `Push de ${base}`, { step: "push" });
        const p = await pushBranch(root, base);
        details.push(p.code === 0 ? `Poussé sur origin/${base}` : `Push échoué : ${p.stderr.trim().slice(0, 200)}`);
      }
      return { kind: "merge", summary: `Modifications fusionnées dans « ${base} ».`, links, details };
    }

    if (mode === "pr") {
      if (!(await hasRemote(root))) {
        await removeWorktree(root, ws.path);
        details.push("Aucun remote « origin » : la branche reste locale.");
        return { kind: "branch", summary: `Branche « ${branch} » prête (aucun remote pour ouvrir une PR).`, links, details };
      }
      await ctx.emit("integration", `Push de ${branch}`, { step: "push" });
      const p = await pushBranch(root, branch);
      if (p.code !== 0) throw new Error(`Push impossible : ${(p.stderr || p.stdout).trim().slice(0, 400)}`);
      details.push(`Poussé sur origin/${branch}`);
      if (!(await ghAvailable())) {
        await removeWorktree(root, ws.path);
        details.push("`gh` introuvable : ouvrez la pull request manuellement.");
        return { kind: "branch", summary: `Branche poussée. Installez GitHub CLI (gh) pour créer la PR automatiquement.`, links, details };
      }
      await ctx.emit("integration", "Création de la pull request", { step: "pr" });
      const body = [
        task.buildResult?.summary ?? "",
        "",
        "## Critères d'acceptation",
        ...(task.refinedSpec?.acceptanceCriteria ?? []).map((c) => `- [x] ${c}`),
        "",
        "## Contrôle",
        task.verifyResult?.summary ?? "",
        "",
        "_Ouvert par Atelier._",
      ].join("\n");
      const pr = await createPullRequest(root, { title: task.title, body, base, head: branch, draft: project.integrations.github.draft });
      await removeWorktree(root, ws.path);
      if (!pr.ok) {
        details.push(`PR non créée : ${(pr.error ?? "").trim().slice(0, 300)}`);
        return { kind: "branch", summary: "Branche poussée, mais la PR n'a pas pu être créée automatiquement.", links, details };
      }
      if (pr.url) {
        links.push({ label: "Pull request", url: pr.url });
        await addArtifact({ taskId: task.id, kind: "pr", title: "Pull request", url: pr.url });
      }
      return { kind: "pr", summary: "Pull request ouverte sur GitHub.", links, details };
    }

    // mode "branch"
    await removeWorktree(root, ws.path);
    details.push(`git checkout ${branch}`);
    if (project.integrations.git.autoPush && (await hasRemote(root))) {
      const p = await pushBranch(root, branch);
      details.push(p.code === 0 ? `Poussé sur origin/${branch}` : `Push échoué : ${p.stderr.trim().slice(0, 200)}`);
    }
    return { kind: "branch", summary: `Branche « ${branch} » prête à être récupérée.`, links, details };
  }

  // Dossier de livrables
  const target = ws.targetDir!;
  await ctx.emit("integration", `Copie vers ${path.relative(project.workspacePath, target) || target}`, { step: "copy" });
  await copyDir(ws.path, target);
  const files = await listFilesRecursive(target, 200);
  await removeDir(ws.path);
  await addArtifact({ taskId: task.id, kind: "folder", title: path.relative(project.workspacePath, target) || target, path: target, url: fileUrl(target) });
  return {
    kind: "folder",
    summary: `${files.length} fichier${files.length > 1 ? "s" : ""} livré${files.length > 1 ? "s" : ""} dans « ${path.relative(project.workspacePath, target) || target} ».`,
    links: [{ label: "Ouvrir le dossier", url: fileUrl(target) }],
    details: files.slice(0, 30),
  };
}

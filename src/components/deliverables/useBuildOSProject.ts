"use client";

import { useEffect } from "react";
import type { Project } from "@/lib/domain/types";
import { useCurrentProject } from "@/lib/client/store";
import { useBuildOS } from "@/lib/buildos/store";

/** Projet courant, avec ses données BuildOS simulées initialisées (fondations, releases…). */
export function useBuildOSProject(): Project | null {
  const project = useCurrentProject();
  const ensureProject = useBuildOS((s) => s.ensureProject);
  useEffect(() => {
    if (project) ensureProject(project);
  }, [project, ensureProject]);
  return project;
}

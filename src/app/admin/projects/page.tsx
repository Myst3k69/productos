import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsView } from "@/components/admin/ProjectsView";

export const metadata: Metadata = { title: "Projets" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProjectsView />
    </Suspense>
  );
}

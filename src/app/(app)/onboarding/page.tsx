import { Suspense } from "react";
import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata: Metadata = { title: "Démarrer un projet" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Onboarding />
    </Suspense>
  );
}

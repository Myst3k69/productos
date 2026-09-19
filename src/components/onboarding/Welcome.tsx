"use client";

import { useStore } from "@/lib/client/store";

export function Welcome() {
  const seedDemo = useStore((s) => s.seedDemo);
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4">
      <h1 className="font-display text-3xl font-bold">Atelier</h1>
      <button type="button" onClick={() => void seedDemo()} className="rounded-md bg-accent px-4 py-2 text-white">
        Charger la demo
      </button>
    </div>
  );
}

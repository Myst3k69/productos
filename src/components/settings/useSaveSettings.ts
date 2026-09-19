"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { AppSettings } from "@/lib/domain/types";
import { useStore } from "@/lib/client/store";

const TOAST_ID = "settings-saved";

/** Sauvegarde immédiate d'un réglage, avec un toast discret (un seul à la fois). */
export function useSaveSettings() {
  const updateSettings = useStore((s) => s.updateSettings);
  return useCallback(
    async (patch: Partial<AppSettings>, description?: string) => {
      try {
        await updateSettings(patch);
        toast.success("Réglage enregistré", { id: TOAST_ID, description, duration: 1600 });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Enregistrement impossible.");
      }
    },
    [updateSettings],
  );
}

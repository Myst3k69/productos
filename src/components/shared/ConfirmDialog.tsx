"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/client/utils";

/**
 * Confirmation d'une action irréversible. Contrôlé par `open` / `onOpenChange`.
 * Peut être imbriqué dans une autre boîte de dialogue (Radix gère la pile).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "danger",
  loading,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "accent";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => (!loading ? onOpenChange(o) : undefined)}>
      <DialogContent size="sm" className="top-[18vh] p-6" aria-describedby={description ? undefined : ""}>
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tone === "danger" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-ink",
            )}
            aria-hidden
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <DialogTitle className="font-display text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">{title}</DialogTitle>
            {description ? <DialogDescription className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2 text-pretty">{description}</DialogDescription> : null}
            {children}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={() => void onConfirm()}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

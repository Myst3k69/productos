"use client";

import * as React from "react";
import { Check, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useAct } from "./hooks";

/** Le moment HITL : valider et intégrer, demander des retouches ou refuser. */
export function ReviewActions({ task }: { task: Task }) {
  const [comment, setComment] = React.useState("");
  const { run, pending } = useAct(task.id);
  const trimmed = comment.trim();
  const busy = pending !== null;

  const approve = async () => {
    const res = await run({ action: "approve", comment: trimmed || undefined });
    if (res) toast.success("Validé. L'IA intègre le résultat.");
  };
  const requestChanges = async () => {
    if (!trimmed) return;
    const res = await run({ action: "request_changes", comment: trimmed });
    if (res) {
      toast.success("Retouches demandées. L'IA reprend la fabrication.");
      setComment("");
    }
  };
  const reject = async () => {
    if (!window.confirm("Refuser ce résultat ? La tâche retournera dans « À faire » et le travail de l'IA ne sera pas intégré.")) return;
    const res = await run({ action: "reject", comment: trimmed || undefined });
    if (res) toast("Résultat refusé. La tâche est de retour dans « À faire ».");
  };

  return (
    <section id="drawer-review-actions" aria-labelledby="drawer-review-title" className="reveal-fast rounded-lg border border-accent/30 bg-accent-soft/40 p-4">
      <h3 id="drawer-review-title" className="font-display text-[15px] font-semibold text-ink">
        Votre validation
      </h3>
      <p className="mt-0.5 text-[12.5px] text-ink-3">Vous avez le dernier mot : intégrer tel quel, demander des retouches ou refuser.</p>
      <Textarea
        id="drawer-review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Un mot pour l'IA (facultatif pour valider, requis pour des retouches)"
        className="mt-3 min-h-[84px] bg-card"
        aria-label="Commentaire pour l'IA"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" disabled={busy} loading={pending === "approve"} onClick={() => void approve()}>
          <Check className="h-3.5 w-3.5" />
          Valider et intégrer
        </Button>
        <Button variant="secondary" size="sm" disabled={busy || !trimmed} loading={pending === "request_changes"} onClick={() => void requestChanges()} title={trimmed ? undefined : "Décrivez les retouches attendues dans le commentaire"}>
          <Undo2 className="h-3.5 w-3.5" />
          Demander des retouches
        </Button>
        <span className="flex-1" />
        <Button variant="danger" size="sm" disabled={busy} loading={pending === "reject"} onClick={() => void reject()}>
          <X className="h-3.5 w-3.5" />
          Refuser
        </Button>
      </div>
      {!trimmed ? <p className="mt-2 text-[11.5px] text-ink-4">Ajoutez un commentaire pour pouvoir demander des retouches.</p> : null}
    </section>
  );
}

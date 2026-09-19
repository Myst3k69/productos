"use client";

import * as React from "react";
import { toast } from "sonner";
import { Maximize2, Plus } from "lucide-react";
import { guessTaskType } from "@/lib/domain/helpers";
import { useStore, useCurrentProject } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/input";
import { Kbd } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { TypeChip } from "@/components/shared/task-bits";

const MAX_HEIGHT = 160;

/** Ajout rapide en bas de la colonne « À faire » : une phrase, Entrée, et l'IA prend la main. */
export function QuickAdd() {
  const project = useCurrentProject();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [startNow, setStartNow] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const manual = project?.autonomy === "manual";
  const willStart = startNow && !manual;
  const trimmed = value.trim();
  const [firstLine = "", ...restLines] = trimmed.split("\n");
  const title = firstLine.trim().slice(0, 200);
  const spec = restLines.join("\n").trim();
  const type = trimmed ? guessTaskType(trimmed) : null;

  React.useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  };

  const clear = () => {
    setValue("");
    if (ref.current) ref.current.style.height = "";
  };

  const cancel = () => {
    clear();
    setOpen(false);
  };

  const submit = async () => {
    if (!title || busy) return;
    setBusy(true);
    try {
      await useStore.getState().createTask({
        title,
        spec,
        type: guessTaskType(trimmed),
        priority: "medium",
        autonomy: null,
        dueDate: null,
        labels: [],
        startNow,
      });
      toast.success(willStart ? "Tâche confiée à l'IA" : "Tâche ajoutée à « À faire »");
      clear();
      ref.current?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de créer la tâche.");
    } finally {
      setBusy(false);
    }
  };

  const detail = () => {
    useStore.getState().openComposer({
      title: title || undefined,
      spec: spec || undefined,
      type: type ?? undefined,
      startNow,
    });
    cancel();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Ajouter une tâche
      </button>
    );
  }

  return (
    <div
      className="reveal-fast rounded-md border border-line-2 bg-card shadow-card transition-[border-color,box-shadow] duration-150 focus-within:border-accent/60 focus-within:shadow-lift"
      onBlur={(e) => {
        if (busy || trimmed) return;
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <textarea
        ref={ref}
        rows={2}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          resize(e.currentTarget);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        placeholder="Que doit faire l'IA ? Une phrase suffit."
        aria-label="Nouvelle tâche"
        className="block w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-[13.5px] leading-snug text-ink placeholder:text-ink-4 focus:outline-none"
      />

      <div className="flex items-center gap-2 px-2 pb-2 pt-1">
        <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-[12px] text-ink-2">
          <Switch checked={startNow} onCheckedChange={setStartNow} label="Confier à l'IA" className="origin-left scale-90" />
          Confier à l'IA
        </label>
        {type ? <TypeChip type={type} size="xs" className="reveal-fast" /> : null}
        <span className="flex-1" />
        <Tooltip content="Détailler dans le formulaire complet">
          <Button variant="ghost" size="icon-sm" aria-label="Détailler la tâche" onClick={detail}>
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </Tooltip>
        <Button variant="ghost" size="xs" onClick={cancel}>
          Annuler
        </Button>
        <Button variant="primary" size="xs" disabled={!title} loading={busy} onClick={() => void submit()}>
          {willStart ? "Confier à l'IA" : "Ajouter"}
          <Kbd className="ml-0.5 h-4 min-w-4 border-white/25 bg-white/15 px-1 text-[10px] text-white/90">↵</Kbd>
        </Button>
      </div>

      {manual && startNow ? <p className="px-3 pb-2 text-[11px] leading-snug text-ink-3">Autonomie manuelle : la tâche attendra que vous cliquiez « Lancer ».</p> : null}
    </div>
  );
}

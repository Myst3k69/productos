"use client";

import * as React from "react";
import { ArrowUp, Eraser, MoreHorizontal, X } from "lucide-react";
import { useStore, useCurrentProject, useProjectTasks } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { useFounder } from "@/components/shell/useFounder";
import { AssistantAvatar, AssistantBubble, TypingBubble } from "./AssistantBubble";
import { AssistantMarkdown } from "./AssistantMarkdown";
import { useAssistant } from "./useAssistant";
import { DEFAULT_SUGGESTIONS, readContext, welcomeText } from "./brain";
import type { AssistantMessage } from "./types";

const EMPTY: AssistantMessage[] = [];

/** Panneau « Assistant IA » : conversation qui cadre un besoin puis crée les tâches. */
export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const projectId = useStore((s) => s.projectId);
  const project = useCurrentProject();
  const tasks = useProjectTasks();
  const founder = useFounder();
  const thread = useAssistant((s) => (projectId ? s.threads[projectId] ?? EMPTY : EMPTY));
  const typing = useAssistant((s) => (projectId ? Boolean(s.typing[projectId]) : false));
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (projectId) useAssistant.getState().hydrate(projectId);
  }, [projectId]);

  // Focus à l'ouverture.
  React.useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(t);
  }, []);

  // Défilement vers le bas à chaque nouveau message.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [thread.length, typing]);

  // L'accueil est recalculé à chaque rendu (compteurs à jour) ; il n'est pas stocké.
  const welcome = projectId ? welcomeText({ ...readContext(projectId), tasks, firstName: founder.hasName ? founder.firstName : "" }) : "";

  const last = thread[thread.length - 1];
  const lastAssistant = [...thread].reverse().find((m) => m.role === "assistant");
  const awaitingAnswers = lastAssistant?.kind === "questions" && last?.role === "assistant";
  const suggestions = typing ? [] : !thread.length ? DEFAULT_SUGGESTIONS : last?.role === "assistant" ? (last.suggestions ?? []) : [];
  const status = typing ? { label: "Écrit…", tone: "ai" as const } : awaitingAnswers ? { label: "Pose des questions", tone: "ok" as const } : { label: "Disponible", tone: "ok" as const };

  const send = (text: string) => {
    if (!projectId || typing || !text.trim()) return;
    useAssistant.getState().send(projectId, text);
    setDraft("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <section aria-label="Assistant IA" className="flex h-full w-full flex-col bg-card">
      {/* En-tête */}
      <header className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-line px-4">
        <AssistantAvatar className="h-8 w-8 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="font-display text-[15px] font-extrabold tracking-[-0.03em] text-ink">Assistant IA</span>
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", status.tone === "ai" ? "text-ai-ink" : "text-ink-3")} role="status">
              <span className={cn("h-1.5 w-1.5 rounded-full", status.tone === "ai" ? "bg-ai animate-blink" : "bg-ok")} aria-hidden />
              {status.label}
            </span>
          </p>
          <p className="truncate text-[11.5px] text-ink-3" title={project?.name}>
            {project ? `${project.emoji} ${project.name}` : "Aucun projet"}
          </p>
        </div>
        <Dropdown>
          <DropdownTrigger asChild>
            <button type="button" aria-label="Options de l'assistant" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownTrigger>
          <DropdownContent align="end" className="w-[220px]">
            <DropdownItem icon={<Eraser />} disabled={!thread.length} onSelect={() => projectId && useAssistant.getState().clear(projectId)}>
              Effacer la conversation
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
        <Tooltip content="Fermer (.)">
          <button type="button" onClick={onClose} aria-label="Fermer l'assistant" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </Tooltip>
      </header>

      {/* Conversation */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-paper/60 px-4 py-4" aria-live="polite">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2.5 pr-2">
            <AssistantAvatar className="mt-0.5" />
            <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-line bg-card px-3 py-2.5 shadow-card">
              <AssistantMarkdown>{welcome}</AssistantMarkdown>
            </div>
          </div>

          {thread.map((m) => (
            <AssistantBubble
              key={m.id}
              message={m}
              onCreatePlan={projectId ? () => useAssistant.getState().createTasks(projectId, m.id) : undefined}
              onChangePlan={projectId ? (plan) => useAssistant.getState().updatePlan(projectId, m.id, plan) : undefined}
            />
          ))}

          {typing ? <TypingBubble /> : null}

          {suggestions.length ? (
            <div className="reveal-fast flex flex-wrap gap-1.5 pl-[38px]" aria-label="Suggestions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="inline-flex h-7 items-center rounded-full border border-line-2 bg-card px-2.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-ai hover:bg-ai-soft hover:text-ai-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Saisie */}
      <form
        className="shrink-0 border-t border-line bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-lg border border-line-2 bg-card p-1.5 pl-3 transition-[border-color,box-shadow] focus-within:border-ai focus-within:ring-2 focus-within:ring-ai/15">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(draft);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            rows={1}
            placeholder={awaitingAnswers ? "Écrivez votre réponse…" : "Décrivez ce que vous voulez construire…"}
            aria-label="Message à l'assistant"
            className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent py-1 text-[13px] leading-[1.45] placeholder:text-ink-4 focus:outline-none [field-sizing:content]"
            style={{ outline: "none" }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || typing}
            aria-label="Envoyer"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink text-paper transition-[background-color,opacity] hover:bg-ink/85 disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10.5px] text-ink-4">Entrée pour envoyer · Maj + Entrée pour aller à la ligne</p>
      </form>
    </section>
  );
}

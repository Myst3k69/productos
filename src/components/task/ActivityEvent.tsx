"use client";

import * as React from "react";
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  FileSearch,
  Globe,
  MessageSquare,
  Package,
  Pencil,
  Terminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { TaskEvent } from "@/lib/domain/types";
import { cn, shortTime } from "@/lib/client/utils";
import { asAnswers, asQuestions, asStrings } from "./drawer-utils";

const TOOL_ICONS: Record<string, LucideIcon> = {
  Read: FileSearch,
  Glob: FileSearch,
  Grep: FileSearch,
  LS: FileSearch,
  Write: Pencil,
  Edit: Pencil,
  MultiEdit: Pencil,
  NotebookEdit: Pencil,
  Bash: Terminal,
  WebSearch: Globe,
  WebFetch: Globe,
};

function toolIcon(tool: unknown): LucideIcon {
  return (typeof tool === "string" && TOOL_ICONS[tool]) || Wrench;
}

const LONG = 160;

/** Une ligne du journal d'activité, rendue selon son type. */
export const ActivityEvent = React.memo(function ActivityEvent({ event }: { event: TaskEvent }) {
  return (
    <div className="group flex items-start gap-3 px-5 py-[3px]">
      <div className="min-w-0 flex-1">
        <EventBody event={event} />
      </div>
      <time dateTime={event.ts} className="shrink-0 pt-1 font-mono text-[10.5px] text-ink-4 opacity-70 transition-opacity group-hover:opacity-100">
        {shortTime(event.ts)}
      </time>
    </div>
  );
});

function EventBody({ event }: { event: TaskEvent }) {
  const { kind, message, data } = event;
  switch (kind) {
    case "text":
      return <p className="whitespace-pre-wrap rounded-md border border-line bg-card-2 p-3 text-[13px] leading-relaxed text-ink">{message}</p>;

    case "tool_use": {
      const Icon = toolIcon(data?.tool);
      return (
        <div className="flex items-center gap-2 py-0.5 font-mono text-[12px] text-ink-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
          <span className="truncate" title={message}>
            {message}
          </span>
        </div>
      );
    }

    case "tool_result":
      return <Foldable text={message} danger={data?.isError === true} />;

    case "thinking":
      return <Thinking text={message} />;

    case "question": {
      const qs = asQuestions(data);
      return (
        <Box tone="warn" icon={CircleHelp} title={message}>
          {qs.length ? (
            <ul className="mt-1.5 flex flex-col gap-1">
              {qs.map((q) => (
                <li key={q.id} className="text-[12.5px] text-ink">
                  {q.question}
                </li>
              ))}
            </ul>
          ) : null}
        </Box>
      );
    }

    case "answer": {
      const answers = asAnswers(data);
      return (
        <Box tone="accent" icon={MessageSquare} title="Vos réponses">
          {answers.length ? (
            <ul className="mt-1.5 flex flex-col gap-1">
              {answers.map((a) => (
                <li key={a.questionId} className="text-[12.5px] text-ink">
                  {a.answer}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[12.5px] text-ink-2">{message}</p>
          )}
        </Box>
      );
    }

    case "review":
      return <Box tone="accent" icon={Eye} title={message} />;

    case "feedback": {
      const issues = asStrings(data?.issues);
      return (
        <Box tone="accent" icon={MessageSquare} title={message}>
          {issues.length ? (
            <ul className="mt-1.5 list-disc pl-4 text-[12.5px] text-ink-2">
              {issues.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : null}
        </Box>
      );
    }

    case "error":
      return <Box tone="danger" icon={AlertTriangle} title="Erreur" body={message} />;

    case "integration":
      return (
        <div className="flex items-center gap-2 py-0.5 text-[12.5px] text-ink-2">
          <Package className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
          <span className="truncate" title={message}>
            {message}
          </span>
        </div>
      );

    case "progress":
      return <p className="py-0.5 text-[12px] font-medium text-ink-3">{message}</p>;

    case "stage":
      return null;

    default:
      return <p className="py-0.5 text-[12px] text-ink-3">{message}</p>;
  }
}

function Box({ tone, icon: Icon, title, body, children }: { tone: "warn" | "accent" | "danger"; icon: LucideIcon; title: string; body?: string; children?: React.ReactNode }) {
  const cls = tone === "warn" ? "border-warn/30 bg-warn-soft/60 text-warn" : tone === "danger" ? "border-danger/30 bg-danger-soft/60 text-danger" : "border-accent/30 bg-accent-soft/60 text-accent-ink";
  return (
    <div className={cn("rounded-md border p-3", cls)}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink">{title}</p>
          {body ? <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2">{body}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

function Foldable({ text, danger }: { text: string; danger: boolean }) {
  const long = text.length > LONG;
  const [open, setOpen] = React.useState(false);
  const shown = long && !open ? `${text.slice(0, LONG).trimEnd()}…` : text;
  return (
    <div className={cn("flex items-start gap-1.5 pl-5 font-mono text-[12px]", danger ? "text-danger" : "text-ink-3")}>
      <span className="select-none text-ink-4">↳</span>
      <div className="min-w-0 flex-1">
        <span className={cn(open ? "whitespace-pre-wrap break-words" : "line-clamp-1 break-all")}>{shown}</span>
        {long ? (
          <button type="button" onClick={() => setOpen((o) => !o)} className="ml-1 inline text-[11px] font-medium text-ink-3 underline-offset-2 hover:text-ink hover:underline">
            {open ? "Réduire" : "Afficher"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Thinking({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="py-0.5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-[12px] italic text-ink-3 hover:text-ink">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Brain className="h-3.5 w-3.5" aria-hidden />
        Réflexion
      </button>
      {open ? <p className="mt-1 whitespace-pre-wrap pl-5 text-[12.5px] italic leading-relaxed text-ink-3">{text}</p> : null}
    </div>
  );
}

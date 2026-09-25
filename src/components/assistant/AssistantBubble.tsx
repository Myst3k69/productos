"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn, shortTime } from "@/lib/client/utils";
import { WorkingDots } from "@/components/ui/misc";
import { AssistantMarkdown } from "./AssistantMarkdown";
import { PlanCard } from "./PlanCard";
import type { AssistantMessage, AssistantPlan } from "./types";

export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ai text-white", className)} aria-hidden>
      <Sparkles className="h-3.5 w-3.5" />
    </span>
  );
}

/** Un message de la conversation : bulle utilisateur (bleu IA doux) ou réponse de l'IA (carte). */
export function AssistantBubble({
  message,
  onCreatePlan,
  onChangePlan,
}: {
  message: AssistantMessage;
  onCreatePlan?: () => Promise<void>;
  onChangePlan?: (plan: AssistantPlan) => void;
}) {
  const time = message.at ? shortTime(message.at) : null;

  if (message.role === "user") {
    return (
      <div className="reveal-fast flex flex-col items-end gap-1 pl-8">
        <div className="max-w-full whitespace-pre-wrap break-words rounded-xl rounded-br-sm bg-ai-soft px-3 py-2 text-[13px] leading-[1.5] text-ink">{message.text}</div>
        {time ? <time className="font-mono text-[10.5px] text-ink-4">{time}</time> : null}
      </div>
    );
  }

  return (
    <div className="reveal-fast flex gap-2.5 pr-2">
      <AssistantAvatar className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="rounded-xl rounded-tl-sm border border-line bg-card px-3 py-2.5 shadow-card">
          <AssistantMarkdown>{message.text}</AssistantMarkdown>
          {message.questions?.length ? (
            <ol className="mt-2 flex flex-col gap-1.5">
              {message.questions.map((q, i) => (
                <li key={q} className="flex gap-2 text-[13px] leading-snug text-ink">
                  <span className="mt-px inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-paper-2 font-mono text-[10.5px] font-semibold text-ink-2">{i + 1}</span>
                  <span className="min-w-0">{q}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {message.links?.length ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {message.links.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-line-2 bg-card px-2.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink"
                >
                  {l.label}
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        {message.plan && onCreatePlan && onChangePlan ? <PlanCard plan={message.plan} onCreate={onCreatePlan} onChange={onChangePlan} /> : null}
        {time ? <time className="font-mono text-[10.5px] text-ink-4">{time}</time> : null}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="reveal-fast flex items-center gap-2.5" role="status" aria-live="polite">
      <AssistantAvatar />
      <div className="inline-flex items-center gap-2 rounded-xl rounded-tl-sm border border-line bg-card px-3 py-2 shadow-card">
        <WorkingDots />
        <span className="text-[12px] text-ink-3">écrit…</span>
      </div>
    </div>
  );
}

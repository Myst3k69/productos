"use client";

import * as React from "react";
import { CircleHelp, Send } from "lucide-react";
import { toast } from "sonner";
import type { ClarifyQuestion, Task } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { useAct } from "./hooks";

/** Questions bloquantes du cadrage : options cliquables, réponse libre, envoi qui relance l'IA. */
export function QuestionsForm({ task, questions }: { task: Task; questions: ClarifyQuestion[] }) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const { run, pending } = useAct(task.id);
  const set = (id: string, value: string) => setAnswers((a) => ({ ...a, [id]: value }));

  const filled = questions.filter((q) => (answers[q.id] ?? "").trim().length > 0);
  const ready = filled.length > 0 && questions.every((q) => !q.blocking || (answers[q.id] ?? "").trim().length > 0);

  const submit = async () => {
    if (!ready || pending) return;
    const res = await run({
      action: "answer",
      answers: filled.map((q) => ({ questionId: q.id, answer: (answers[q.id] ?? "").trim() })),
    });
    if (res) toast.success("Réponses envoyées. L'IA reprend le cadrage.");
  };

  return (
    <section id="drawer-questions" aria-labelledby="drawer-questions-title" className="reveal-fast rounded-lg border border-warn/30 bg-warn-soft/40 p-4">
      <header className="flex items-center gap-2">
        <CircleHelp className="h-4 w-4 text-warn" aria-hidden />
        <h3 id="drawer-questions-title" className="font-display text-[14.5px] font-semibold text-ink">
          {questions.length > 1 ? `${questions.length} questions avant de continuer` : "Une question avant de continuer"}
        </h3>
      </header>
      <p className="mt-1 text-[12.5px] text-ink-3">L'IA a besoin de votre réponse pour cadrer la tâche correctement. Choisissez une option ou écrivez la vôtre.</p>

      <ol className="mt-4 flex flex-col gap-5">
        {questions.map((q, i) => (
          <li key={q.id} className="flex flex-col gap-2">
            <div>
              <p className="text-[13.5px] font-medium text-ink">
                <span className="mr-1.5 font-mono text-[11px] text-ink-4">{i + 1}.</span>
                {q.question}
                {!q.blocking ? <span className="ml-1.5 text-[11.5px] font-normal text-ink-4">(facultatif)</span> : null}
              </p>
              {q.why ? <p className="mt-0.5 text-[12.5px] text-ink-3">{q.why}</p> : null}
            </div>
            {q.options?.length ? (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Options proposées">
                {q.options.map((o) => (
                  <FilterChip key={o} active={answers[q.id] === o} onClick={() => set(q.id, o)}>
                    {o}
                  </FilterChip>
                ))}
              </div>
            ) : null}
            <Input
              value={answers[q.id] ?? ""}
              onChange={(e) => set(q.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder="Votre réponse…"
              aria-label={q.question}
              className="bg-card"
            />
          </li>
        ))}
      </ol>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-ink-4">{ready ? "L'IA reprendra le cadrage avec vos réponses." : "Répondez à chaque question obligatoire pour continuer."}</p>
        <Button variant="ai" size="sm" disabled={!ready} loading={pending === "answer"} onClick={() => void submit()}>
          <Send className="h-3.5 w-3.5" />
          Envoyer et reprendre
        </Button>
      </div>
    </section>
  );
}

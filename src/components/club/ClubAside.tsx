"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Check } from "lucide-react";
import type { ClubEvent, ClubLab, ClubPost } from "@/lib/buildos/types";
import type { Task } from "@/lib/domain/types";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Avatar, initialsOf } from "./Avatar";
import { EVENT_KIND_META, capitalize, type ClubTab, type ExpertBooking } from "./club-meta";

/** Colonne latérale : mes inscriptions, mes labs, défi de la semaine. */
export function ClubAside({
  events,
  labs,
  bookings,
  posts,
  tasks,
  onGo,
  onShare,
}: {
  events: ClubEvent[];
  labs: ClubLab[];
  bookings: ExpertBooking[];
  posts: ClubPost[];
  tasks: Task[];
  onGo: (t: ClubTab) => void;
  onShare: () => void;
}) {
  const mine = events.filter((e) => e.registered).sort((a, b) => a.date.localeCompare(b.date));
  const myLabs = labs.filter((l) => l.joined);

  // Défi de la semaine : « Livrer une fonctionnalité en public », calculé sur l'activité réelle du prototype.
  const weekAgo = Date.now() - 7 * 86_400_000;
  const steps = [
    { label: "Choisir la fonctionnalité", hint: "Créez la tâche sur votre tableau", done: tasks.length > 0 },
    { label: "La livrer avec BuildOS", hint: "Une tâche validée et terminée", done: tasks.some((t) => t.status === "done") },
    { label: "La partager au Build Club", hint: "Publiez votre avancement", done: posts.some((p) => p.role === "Membre BuildOS" && new Date(p.at).getTime() > weekAgo) },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Mes inscriptions" count={mine.length + bookings.length}>
        {mine.length || bookings.length ? (
          <ul className="flex flex-col gap-1">
            {mine.map((e) => {
              const d = new Date(e.date);
              return (
                <li key={e.id} className="flex items-center gap-3 rounded-md px-1 py-1.5">
                  <span className="flex w-10 shrink-0 flex-col items-center rounded-md border border-line-2 bg-paper-2 py-1 leading-none">
                    <span className="font-display text-[16px] font-black tracking-[-0.04em] text-ink">{format(d, "d")}</span>
                    <span className="mt-0.5 font-mono text-[9.5px] uppercase text-ink-3">{format(d, "MMM", { locale: fr }).replace(".", "")}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink" title={e.title}>
                      {e.title}
                    </span>
                    <span className="block text-[11.5px] text-ink-3">
                      {EVENT_KIND_META[e.kind].label} · {capitalize(format(d, "EEEE HH:mm", { locale: fr }))}
                    </span>
                  </span>
                </li>
              );
            })}
            {bookings.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-md px-1 py-1.5">
                <Avatar initials={initialsOf(b.expertName)} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">30 min avec {b.expertName}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">
                    {b.slot} · {b.price} €{b.shared ? " (partagé)" : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Aucune inscription pour l'instant. Le prochain atelier gratuit a lieu cette semaine." action="Voir l'agenda" onClick={() => onGo("agenda")} />
        )}
      </Panel>

      <Panel title="Mes labs" count={myLabs.length}>
        {myLabs.length ? (
          <ul className="flex flex-col gap-1">
            {myLabs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 rounded-md px-1 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{l.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{l.cadence}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-ink-3">{l.members} membres</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Rejoignez un lab pour avancer chaque semaine avec des pairs." action="Découvrir les labs" onClick={() => onGo("labs")} />
        )}
      </Panel>

      <section aria-labelledby="challenge-title" className="relative rounded-xl border border-line bg-card p-4 pt-6 shadow-card">
        <span className="sticky-lime absolute -top-3 left-4 rounded-sm px-2 py-0.5 text-[12.5px] uppercase [transform:rotate(-3deg)]">Défi de la semaine</span>
        <h3 id="challenge-title" className="text-[18px] font-black leading-tight tracking-[-0.035em] text-ink">
          Livrer une fonctionnalité en public
        </h3>
        <p className="mt-1 text-[12.5px] text-ink-3">
          <span className="font-mono font-semibold text-ink-2">142</span> membres relèvent le défi · se termine dimanche
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Progress value={doneCount / steps.length} tone={doneCount === steps.length ? "ok" : "accent"} className="h-1.5" />
          <span className="shrink-0 font-mono text-[11.5px] font-semibold text-ink-2">
            {doneCount}/{steps.length}
          </span>
        </div>
        <ol className="mt-3 flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10.5px] font-bold",
                  s.done ? "bg-ok text-white" : "border border-line-3 text-ink-3",
                )}
                aria-hidden
              >
                {s.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-[13px] font-medium", s.done ? "text-ink-3 line-through decoration-line-3" : "text-ink")}>{s.label}</span>
                {!s.done ? <span className="block text-[11.5px] text-ink-3">{s.hint}</span> : null}
              </span>
              <span className="sr-only">{s.done ? "(fait)" : "(à faire)"}</span>
            </li>
          ))}
        </ol>
        {doneCount === steps.length ? (
          <p className="mt-3 rounded-md bg-ok-soft px-2.5 py-2 text-[12.5px] font-semibold text-ok">Défi relevé. Bravo, on en parle au prochain live !</p>
        ) : !steps[2].done ? (
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={onShare}>
            Publier mon avancement
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        ) : null}
      </section>
    </div>
  );
}

function Panel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-card" aria-label={title}>
      <div className="mb-2 flex items-center justify-between">
        <h3>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</span>
        </h3>
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-paper-3 px-1 font-mono text-[10.5px] font-semibold text-ink-2">{count}</span>
      </div>
      {children}
    </section>
  );
}

function Empty({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-line-3 px-3 py-3">
      <p className="text-[12.5px] leading-snug text-ink-3">{text}</p>
      <button type="button" onClick={onClick} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-ink hover:underline">
        {action}
        <ArrowRight className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}

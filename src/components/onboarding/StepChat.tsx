"use client";

import * as React from "react";
import { ArrowUp, Check, Pencil, Plus } from "lucide-react";
import { APP_TYPE_META, guessAppType } from "@/lib/buildos/generate";
import { Button } from "@/components/ui/button";
import { WorkingDots } from "@/components/ui/misc";
import { cn } from "@/lib/client/utils";
import { AssistantAvatar } from "./AssistantAvatar";
import { StepHeading } from "./StepHeading";
import {
  AUDIENCE_SUGGESTIONS,
  CONSTRAINT_OPTIONS,
  NO_CONSTRAINT,
  PROBLEM_SUGGESTIONS,
  TYPE_NOUN,
  featureOptions,
  nbsp,
  upperFirst,
  type AppType,
  type ChatAnswers,
  type StepProps,
} from "./draft";

type QKey = keyof ChatAnswers;
const ORDER: QKey[] = ["appType", "audience", "problem", "features", "constraints"];

interface Item {
  key: string;
  role: "ai" | "user";
  text: string;
  sub?: string;
  quote?: string;
  /** Question posée par ce message */
  q?: QKey;
  /** Réponse à cette question (bulle utilisateur modifiable) */
  a?: QKey;
}

export function chatComplete(chat: ChatAnswers) {
  return chat.constraints !== undefined;
}

function truncate(s: string, n: number) {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, "")}…` : t;
}

function buildItems(idea: string, chat: ChatAnswers, firstName: string, simple: boolean): Item[] {
  const guess = guessAppType(idea);
  const type = chat.appType ?? guess;
  const items: Item[] = [
    { key: "hello", role: "ai", text: `Bonjour${firstName ? ` ${firstName}` : ""} ! J'ai lu votre idée attentivement.` },
    {
      key: "summary",
      role: "ai",
      text: `Si je résume, vous voulez construire ${TYPE_NOUN[guess]} : ${APP_TYPE_META[guess].hint.toLowerCase()}.`,
      quote: truncate(idea, 170),
    },
    { key: "q-appType", role: "ai", text: "C'est bien ça ?", sub: "Le type d'application oriente tout le reste : parcours, données, architecture.", q: "appType" },
  ];
  if (!chat.appType) return items;
  items.push({ key: "a-appType", role: "user", a: "appType", text: chat.appType === guess ? `Oui, c'est ça : ${TYPE_NOUN[guess]}.` : `Plutôt ${TYPE_NOUN[chat.appType]}.` });

  items.push({ key: "q-audience", role: "ai", text: "Parfait. Pour qui construisez-vous en priorité ?", sub: "Votre cible principale : les personnes qui utiliseront ou paieront en premier.", q: "audience" });
  if (chat.audience === undefined) return items;
  items.push({ key: "a-audience", role: "user", a: "audience", text: chat.audience });

  items.push({ key: "q-problem", role: "ai", text: "Quel est le problème n°1 que vous leur retirez ?", sub: "Un seul problème, le plus douloureux. C'est lui qui fera venir vos premiers utilisateurs.", q: "problem" });
  if (chat.problem === undefined) return items;
  items.push({ key: "a-problem", role: "user", a: "problem", text: upperFirst(chat.problem) });

  items.push({
    key: "q-features",
    role: "ai",
    text: simple ? "Que doit absolument savoir faire l'application dès la première version ?" : `Quelles fonctionnalités sont indispensables en v1 pour ${TYPE_NOUN[type]} ?`,
    sub: "J'en ai présélectionné trois. Gardez-en 3 à 5 : le reste attendra la version suivante.",
    q: "features",
  });
  if (!chat.features) return items;
  items.push({ key: "a-features", role: "user", a: "features", text: chat.features.join(" · ") });

  items.push({ key: "q-constraints", role: "ai", text: "Dernière question : des contraintes à connaître ?", sub: "Budget, délai, paiement, données personnelles… Je les transmettrai à chaque agent.", q: "constraints" });
  if (!chat.constraints) return items;
  items.push({ key: "a-constraints", role: "user", a: "constraints", text: chat.constraints.length ? chat.constraints.join(" · ") : NO_CONSTRAINT });

  items.push({
    key: "done",
    role: "ai",
    text: `Merci${firstName ? ` ${firstName}` : ""}, j'ai tout ce qu'il me faut. Votre brief est rédigé : relisez-le à l'étape suivante et changez ce que vous voulez.`,
  });
  return items;
}

const typingDelay = (it: Item) => 650 + Math.min(1100, (it.text.length + (it.quote?.length ?? 0)) * 9);

export function StepChat({ draft, update, simple, index }: StepProps) {
  const firstName = draft.name.trim().split(/\s+/)[0] ?? "";
  const items = React.useMemo(() => buildItems(draft.idea, draft.chat, firstName, simple), [draft.idea, draft.chat, firstName, simple]);
  const [shown, setShown] = React.useState<Set<string>>(() => new Set(draft.chat.appType ? items.map((i) => i.key) : []));
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const nextHidden = items.find((i) => i.role === "ai" && !shown.has(i.key));
  const nextKey = nextHidden?.key;
  React.useEffect(() => {
    if (!nextHidden) return;
    const t = window.setTimeout(() => setShown((s) => new Set(s).add(nextHidden.key)), typingDelay(nextHidden));
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextKey]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [shown.size, items.length]);

  // Messages visibles : tout jusqu'au premier message de l'IA encore « en train d'écrire ».
  const visible: Item[] = [];
  for (const it of items) {
    if (it.role === "ai" && !shown.has(it.key)) break;
    visible.push(it);
  }
  const typing = !!nextHidden;
  const last = visible[visible.length - 1];
  const pending = !typing && last?.role === "ai" && last.q ? last.q : null;
  const type: AppType = draft.chat.appType ?? guessAppType(draft.idea);
  const complete = chatComplete(draft.chat);

  const answer = <K extends QKey>(key: K, value: ChatAnswers[K]) => update((d) => ({ chat: { ...d.chat, [key]: value } }));
  const editFrom = (key: QKey) =>
    update((d) => {
      const chat: ChatAnswers = { ...d.chat };
      ORDER.slice(ORDER.indexOf(key)).forEach((k) => delete chat[k]);
      return { chat };
    });

  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        index={index}
        eyebrow="Quelques questions"
        title={
          <>
            L&apos;IA vous pose <span className="marker-underline">quelques</span> questions.
          </>
        }
        lead="Quatre questions, une à une. Choisissez une réponse suggérée ou écrivez la vôtre."
      />

      <section aria-label="Conversation avec l'assistant BuildOS" className="reveal flex flex-col overflow-hidden rounded-xl border-[1.5px] border-ink bg-card shadow-brutal" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="flex items-center gap-2.5 border-b border-line-2 px-4 py-2.5">
          <AssistantAvatar size={26} />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="font-display text-[14px] font-bold tracking-[-0.02em]">Assistant BuildOS</span>
            <span className="text-[11.5px] text-ink-3">Cadrage de votre projet</span>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]", complete ? "text-ok" : "text-ai-ink")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", complete ? "bg-ok" : "animate-blink bg-ai")} />
            {complete ? "Brief prêt" : typing ? "Écrit…" : "Vous écoute"}
          </span>
        </div>

        <div ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions" className="scrollbar-thin flex h-[min(46dvh,440px)] min-h-[280px] flex-col gap-2.5 overflow-y-auto px-4 py-4">
          {visible.map((it, i) => {
            const prev = visible[i - 1];
            const grouped = prev?.role === it.role;
            return it.role === "ai" ? (
              <div key={it.key} className={cn("reveal-fast flex items-start gap-2.5", grouped ? "" : "mt-1.5")}>
                {grouped ? <span className="w-[26px] shrink-0" aria-hidden /> : <AssistantAvatar size={26} />}
                <div className="max-w-[88%] rounded-[14px] rounded-tl-[4px] bg-ai-soft px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
                  <p>{nbsp(it.text)}</p>
                  {it.quote ? <p className="mt-1.5 border-l-2 border-ai pl-2.5 text-[13px] italic text-ink-2">« {it.quote} »</p> : null}
                  {it.sub ? <p className="mt-1 text-[12.5px] text-ink-3">{nbsp(it.sub)}</p> : null}
                </div>
              </div>
            ) : (
              <div key={it.key} className="reveal-fast group flex items-start justify-end gap-1.5">
                {it.a && !draft.projectId ? (
                  <button
                    type="button"
                    onClick={() => editFrom(it.a as QKey)}
                    aria-label="Modifier cette réponse"
                    className="mt-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-4 opacity-0 transition-opacity hover:bg-paper-2 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <p className="max-w-[80%] rounded-[14px] rounded-tr-[4px] bg-ink px-3.5 py-2.5 text-[14px] leading-relaxed text-paper">{it.text}</p>
              </div>
            );
          })}
          {typing ? (
            <div className="reveal-fast flex items-center gap-2.5" aria-label="L'assistant écrit">
              {last?.role === "ai" ? <span className="w-[26px] shrink-0" aria-hidden /> : <AssistantAvatar size={26} />}
              <span className="inline-flex h-9 items-center rounded-[14px] rounded-tl-[4px] bg-ai-soft px-3.5">
                <WorkingDots />
              </span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-line-2 bg-card-2 px-3 py-3 sm:px-4">
          {pending === "appType" ? (
            <SingleAnswer
              key="appType"
              options={[
                { value: type, label: "Oui, c'est ça", primary: true },
                ...(Object.keys(APP_TYPE_META) as AppType[]).filter((t) => t !== type).map((t) => ({ value: t, label: APP_TYPE_META[t].label })),
              ]}
              onPick={(v) => answer("appType", v as AppType)}
            />
          ) : pending === "audience" ? (
            <SingleAnswer key="audience" options={AUDIENCE_SUGGESTIONS[type].map((s) => ({ value: s, label: s }))} onPick={(v) => answer("audience", v)} free="Ou décrivez votre cible…" />
          ) : pending === "problem" ? (
            <SingleAnswer key="problem" options={PROBLEM_SUGGESTIONS[type].map((s) => ({ value: s, label: upperFirst(s) }))} onPick={(v) => answer("problem", v)} free="Ou décrivez le problème avec vos mots…" />
          ) : pending === "features" ? (
            <MultiAnswer key="features" options={featureOptions(draft.idea, type)} initial={featureOptions(draft.idea, type).slice(0, 3)} max={6} free="Ajouter une fonctionnalité…" onSubmit={(v) => answer("features", v)} />
          ) : pending === "constraints" ? (
            <MultiAnswer key="constraints" options={CONSTRAINT_OPTIONS} initial={[]} free="Autre contrainte…" allowEmpty emptyLabel={NO_CONSTRAINT} onSubmit={(v) => answer("constraints", v)} />
          ) : (
            <p className="flex min-h-[36px] items-center gap-2 px-1 text-[13px] text-ink-3">
              {complete ? (
                <>
                  <Check className="h-4 w-4 text-ok" aria-hidden /> Tout est noté. Continuez pour relire votre brief.
                </>
              ) : (
                <>
                  <WorkingDots /> L&apos;assistant réfléchit…
                </>
              )}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────────── Réponses ───────────────────────────── */

function Pill({ active, primary, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 py-1 text-left text-[13px] font-medium leading-snug transition-colors",
        primary ? "border-accent bg-accent text-white hover:bg-accent-ink" : active ? "border-ink bg-ink text-paper" : "border-line-3 bg-card text-ink-2 hover:border-ink hover:text-ink",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function FreeInput({ placeholder, onSubmit, icon = "send" }: { placeholder: string; onSubmit: (v: string) => void; icon?: "send" | "add" }) {
  const [v, setV] = React.useState("");
  const submit = () => {
    const t = v.trim();
    if (!t) return;
    onSubmit(t);
    setV("");
  };
  return (
    <div className="flex items-center gap-2 rounded-full border border-line-2 bg-card py-1 pl-3.5 pr-1 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, "")}
        maxLength={140}
        className="h-8 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink-4 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!v.trim()}
        aria-label={icon === "add" ? "Ajouter" : "Envoyer"}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-opacity disabled:opacity-30"
      >
        {icon === "add" ? <Plus className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SingleAnswer({ options, onPick, free }: { options: { value: string; label: string; primary?: boolean }[]; onPick: (v: string) => void; free?: string }) {
  return (
    <div className="reveal-fast flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Réponses suggérées">
        {options.map((o, i) => (
          <Pill key={o.value} primary={o.primary} autoFocus={i === 0} onClick={() => onPick(o.value)}>
            {o.primary ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            {o.label}
          </Pill>
        ))}
      </div>
      {free ? <FreeInput placeholder={free} onSubmit={onPick} /> : null}
    </div>
  );
}

function MultiAnswer({
  options: base,
  initial,
  onSubmit,
  free,
  max,
  allowEmpty,
  emptyLabel,
}: {
  options: string[];
  initial: string[];
  onSubmit: (v: string[]) => void;
  free: string;
  max?: number;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const [options, setOptions] = React.useState(base);
  const [sel, setSel] = React.useState<string[]>(initial);
  const toggle = (o: string) => setSel((s) => (s.includes(o) ? s.filter((x) => x !== o) : max && s.length >= max ? s : [...s, o]));
  return (
    <div className="reveal-fast flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choix multiples">
        {options.map((o, i) => {
          const on = sel.includes(o);
          return (
            <Pill key={o} active={on} aria-pressed={on} autoFocus={i === 0} onClick={() => toggle(o)}>
              {on ? <Check className="h-3.5 w-3.5 text-lime" aria-hidden /> : <Plus className="h-3.5 w-3.5 text-ink-4" aria-hidden />}
              {o}
            </Pill>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <FreeInput
            placeholder={free}
            icon="add"
            onSubmit={(v) => {
              setOptions((o) => (o.includes(v) ? o : [...o, v]));
              setSel((s) => (s.includes(v) ? s : [...s, v]));
            }}
          />
        </div>
        <div className="flex shrink-0 gap-1.5">
          {allowEmpty && emptyLabel ? (
            <Button variant="ghost" size="md" onClick={() => onSubmit([])}>
              Aucune
            </Button>
          ) : null}
          <Button variant="ai" size="md" disabled={!sel.length} onClick={() => onSubmit(sel)} className="rounded-full">
            Valider{sel.length ? <span className="num font-mono text-[12px] opacity-80">({sel.length})</span> : null}
          </Button>
        </div>
      </div>
      {max ? <p className="px-1 text-[11.5px] text-ink-4">Jusqu&apos;à {max} choix. Le reste pourra être ajouté plus tard.</p> : null}
    </div>
  );
}

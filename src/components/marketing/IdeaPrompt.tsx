"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/client/utils";

const IDEAS = [
  "Une app de réservation pour mon restaurant, avec acompte en ligne",
  "Un portail client pour suivre les chantiers de ma société de rénovation",
  "Une place de marché entre coachs sportifs et entreprises",
  "Un outil interne qui prépare nos devis automatiquement",
  "Un SaaS de gestion des stocks pour les caves à vin",
];

/** Champ « Décrivez votre idée… » : exemples qui se tapent tout seuls, envoi vers l'onboarding. */
export function IdeaPrompt({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const idle = !value && !focused;

  useEffect(() => {
    if (!idle) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setTyped(IDEAS[0]);
      return;
    }
    let idea = 0;
    let i = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = IDEAS[idea];
      if (!deleting) {
        i++;
        setTyped(full.slice(0, i));
        if (i >= full.length) {
          deleting = true;
          timer = setTimeout(tick, 1900);
          return;
        }
        timer = setTimeout(tick, 34 + Math.random() * 40);
      } else {
        i -= 2;
        setTyped(full.slice(0, Math.max(0, i)));
        if (i <= 0) {
          deleting = false;
          i = 0;
          idea = (idea + 1) % IDEAS.length;
          timer = setTimeout(tick, 420);
          return;
        }
        timer = setTimeout(tick, 16);
      }
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [idle]);

  return (
    <form
      action="/onboarding"
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        router.push(v ? `/onboarding?idea=${encodeURIComponent(v)}` : "/onboarding");
      }}
      className={cn(
        "group relative flex items-center gap-2 rounded-xl border-[1.5px] border-ink bg-card p-1.5 pl-3.5 shadow-brutal transition-transform focus-within:-translate-x-px focus-within:-translate-y-px",
        className,
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-ai" aria-hidden />
      <label htmlFor="idea-input" className="sr-only">
        Décrivez votre idée
      </label>
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          id="idea-input"
          name="idea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="off"
          placeholder={focused ? "Décrivez votre idée…" : ""}
          className="h-10 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-4 focus-visible:outline-none"
        />
        {idle ? (
          <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-[15px] text-ink-3">
            <span className="caret truncate">{typed || "Décrivez votre idée…"}</span>
          </span>
        ) : null}
      </div>
      <button
        type="submit"
        className="group/cta inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-ink"
      >
        <span className="hidden sm:inline">Lancer</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden />
        <span className="sr-only sm:hidden">Lancer</span>
      </button>
    </form>
  );
}

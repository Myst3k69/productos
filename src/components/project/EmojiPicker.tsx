"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/client/utils";

export const DEFAULT_EMOJI = "🛠️";
const EMOJIS = ["🛠️", "🚀", "🌊", "✨", "🧭", "📦", "🎯", "🧪", "🪴", "🎨", "📣", "🏗️"];

/** Rangée d'emojis cliquables + saisie libre. */
export function EmojiPicker({ value, onChange, error, className }: { value: string; onChange: (v: string) => void; error?: string | null; className?: string }) {
  const custom = value !== "" && !EMOJIS.includes(value);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span id="emoji-label" className="text-[12.5px] font-semibold text-ink-2">
        Emoji
      </span>
      <div role="radiogroup" aria-labelledby="emoji-label" className="flex flex-wrap items-center gap-1.5">
        {EMOJIS.map((e) => {
          const active = e === value;
          return (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Emoji ${e}`}
              onClick={() => onChange(e)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md border text-[18px] leading-none transition-[transform,background-color,border-color,box-shadow] duration-150 hover:-translate-y-px",
                active ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]" : "border-line bg-card hover:border-line-3 hover:bg-card-2",
              )}
            >
              <span aria-hidden>{e}</span>
            </button>
          );
        })}
        <span className="mx-1 hidden h-6 w-px bg-line-2 sm:inline-block" aria-hidden />
        <Input
          value={custom ? value : ""}
          onChange={(e) => onChange(e.target.value.trim() || DEFAULT_EMOJI)}
          placeholder="Autre…"
          maxLength={8}
          aria-label="Autre emoji"
          className={cn("h-9 w-[88px] text-center text-[15px]", custom && "border-accent")}
        />
      </div>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}

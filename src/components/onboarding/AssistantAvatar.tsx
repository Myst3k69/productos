import { cn } from "@/lib/client/utils";

/** Avatar de l'assistant BuildOS : monogramme « B/ » sur bleu IA. */
export function AssistantAvatar({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={cn("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-ai" />
      <text x="6.2" y="23.2" className="fill-white" style={{ font: "900 17px var(--font-display)", letterSpacing: "-0.04em" }}>
        B/
      </text>
    </svg>
  );
}

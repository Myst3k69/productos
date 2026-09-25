import type { AgentId } from "@/lib/buildos/types";
import { BrandMark } from "@/components/shell/Brand";
import { cn } from "@/lib/client/utils";

/** Pictogramme générique d'agent (formes géométriques, pas de logos de marque). */
export function AgentGlyph({ id, size = 32, className }: { id: AgentId; size?: number; className?: string }) {
  if (id === "buildos") return <BrandMark size={size} className={className} />;
  const tile: Record<Exclude<AgentId, "buildos">, string> = {
    codex: "bg-ink text-paper",
    "claude-code": "bg-accent-soft text-accent",
    cursor: "bg-ink text-paper",
    copilot: "bg-paper-3 text-ink",
    devin: "bg-ai-soft text-ai",
  };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[7px]", tile[id], className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {id === "codex" ? (
          <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 4v16M5 8l14 8M5 16l14-8" opacity="0.55" />
          </>
        ) : id === "claude-code" ? (
          <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" strokeWidth="2.4" />
        ) : id === "cursor" ? (
          <>
            <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" />
            <path d="M4 7.5 12 12l8-4.5M12 12v9" opacity="0.6" />
          </>
        ) : id === "copilot" ? (
          <>
            <rect x="3" y="8" width="8" height="7" rx="3" />
            <rect x="13" y="8" width="8" height="7" rx="3" />
            <path d="M11 11h2M7 18c3 2 7 2 10 0" />
          </>
        ) : (
          <>
            <path d="M6 4h6a8 8 0 0 1 0 16H6z" />
            <path d="M10 9h2a3 3 0 0 1 0 6h-2z" opacity="0.6" />
          </>
        )}
      </svg>
    </span>
  );
}

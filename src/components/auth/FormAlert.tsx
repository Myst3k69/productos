import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/client/utils";

/** Message d'état sous un formulaire (erreur, succès, information). */
export function FormAlert({ tone, children, className }: { tone: "danger" | "ok" | "info"; children: React.ReactNode; className?: string }) {
  const Icon = tone === "danger" ? AlertCircle : tone === "ok" ? CheckCircle2 : Info;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-2.5 rounded-md border px-3 py-2.5 text-[13px] leading-relaxed",
        tone === "danger" && "border-danger/30 bg-danger-soft text-danger",
        tone === "ok" && "border-ok/30 bg-ok-soft text-ink",
        tone === "info" && "border-line-2 bg-card text-ink-2",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "ok" && "text-ok")} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

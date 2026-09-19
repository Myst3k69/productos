"use client";

import * as React from "react";
import { Maximize2, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/input";

type Mode = "desktop" | "mobile";

/** Aperçu HTML isolé (iframe sandbox) avec bascule mobile / bureau et ouverture en plein écran. */
export function HtmlPreview({ content, title, className }: { content: string; title: string; className?: string }) {
  const [mode, setMode] = React.useState<Mode>("desktop");

  const openFullscreen = () => {
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className={cn("overflow-hidden rounded-md border border-line bg-paper-3", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-paper-2 px-2 py-1.5">
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "desktop", label: "Bureau", icon: <Monitor />, title: "Pleine largeur" },
            { value: "mobile", label: "Mobile", icon: <Smartphone />, title: "390 px de large" },
          ]}
        />
        <Button variant="ghost" size="xs" onClick={openFullscreen}>
          <Maximize2 className="h-3.5 w-3.5" />
          Ouvrir en plein écran
        </Button>
      </div>
      <div className={cn("flex justify-center transition-[padding] duration-300", mode === "mobile" ? "px-3 py-5" : "p-0")}>
        <iframe
          title={title}
          sandbox=""
          srcDoc={content}
          className={cn(
            "block bg-card transition-[width,height,border-radius] duration-300",
            mode === "mobile" ? "h-[640px] w-[390px] rounded-[26px] border-[6px] border-ink shadow-lift" : "h-[520px] w-full border-0",
          )}
        />
      </div>
    </div>
  );
}

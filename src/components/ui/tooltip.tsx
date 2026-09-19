"use client";

import * as React from "react";
import { Tooltip as RadixTooltip } from "radix-ui";
import { cn } from "@/lib/client/utils";

export const TooltipProvider = RadixTooltip.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delay = 350,
  className,
  disabled,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delay?: number;
  className?: string;
  disabled?: boolean;
}) {
  if (disabled || content == null || content === "") return children;
  return (
    <RadixTooltip.Root delayDuration={delay}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            "z-[70] max-w-xs rounded-md bg-ink px-2.5 py-1.5 text-[12px] font-medium leading-snug text-paper shadow-pop",
            "data-[state=delayed-open]:animate-[fadeIn_.12s_ease-out]",
            className,
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-ink" width={10} height={5} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

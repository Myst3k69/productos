"use client";

import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/client/utils";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogTitle = RadixDialog.Title;
export const DialogDescription = RadixDialog.Description;

/** Boîte de dialogue centrée. */
export function DialogContent({ className, children, size = "md", ...props }: React.ComponentProps<typeof RadixDialog.Content> & { size?: "sm" | "md" | "lg" | "xl" }) {
  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px] data-[state=open]:animate-[fadeIn_.18s_ease-out] dark:bg-black/50" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-[8vh] z-50 w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-line-2 bg-card text-ink shadow-pop outline-none",
          "data-[state=open]:animate-[popIn_.22s_var(--ease-out-expo)]",
          width,
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes popIn{from{opacity:0;transform:translate(-50%,-6px) scale(.985)}to{opacity:1;transform:translate(-50%,0) scale(1)}}@keyframes slideInRight{from{transform:translateX(24px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </RadixDialog.Portal>
  );
}

/** Panneau latéral (droite). */
export function SheetContent({ className, children, width = 640, ...props }: React.ComponentProps<typeof RadixDialog.Content> & { width?: number }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/10 data-[state=open]:animate-[fadeIn_.18s_ease-out] dark:bg-black/40" />
      <RadixDialog.Content
        style={{ width: `min(${width}px, calc(100vw - 16px))` }}
        className={cn(
          "fixed bottom-2 right-2 top-2 z-40 flex flex-col overflow-hidden rounded-2xl border border-line-2 bg-paper-2 text-ink shadow-drawer outline-none",
          "data-[state=open]:animate-[slideInRight_.28s_var(--ease-out-expo)]",
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideInRight{from{transform:translateX(24px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ className, children, onClose, ...props }: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5", className)} {...props}>
      <div className="min-w-0 flex-1">{children}</div>
      <RadixDialog.Close asChild>
        <button type="button" aria-label="Fermer" onClick={onClose} className="-mr-2 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-paper-3 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </RadixDialog.Close>
    </div>
  );
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-end gap-2 border-t border-line px-6 py-4", className)} {...props} />;
}

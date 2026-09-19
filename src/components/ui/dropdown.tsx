"use client";

import * as React from "react";
import { DropdownMenu as RadixDropdown } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/client/utils";

export const Dropdown = RadixDropdown.Root;
export const DropdownTrigger = RadixDropdown.Trigger;
export const DropdownGroup = RadixDropdown.Group;
export const DropdownSub = RadixDropdown.Sub;
export const DropdownSubTrigger = RadixDropdown.SubTrigger;

export function DropdownContent({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof RadixDropdown.Content>) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "z-[60] min-w-[200px] overflow-hidden rounded-xl border border-line-2 bg-card p-1.5 text-ink shadow-pop",
          "data-[state=open]:animate-[popIn2_.16s_var(--ease-out-expo)]",
          className,
        )}
        {...props}
      >
        {children}
        <style>{`@keyframes popIn2{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}`}</style>
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  );
}

export function DropdownSubContent({ className, ...props }: React.ComponentProps<typeof RadixDropdown.SubContent>) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.SubContent sideOffset={4} className={cn("z-[60] min-w-[180px] rounded-xl border border-line-2 bg-card p-1.5 shadow-pop", className)} {...props} />
    </RadixDropdown.Portal>
  );
}

export function DropdownItem({ className, icon, shortcut, destructive, children, ...props }: React.ComponentProps<typeof RadixDropdown.Item> & { icon?: React.ReactNode; shortcut?: string; destructive?: boolean }) {
  return (
    <RadixDropdown.Item
      className={cn(
        "flex cursor-default select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] outline-none",
        "data-[highlighted]:bg-paper-3 data-[disabled]:opacity-50",
        destructive ? "text-danger data-[highlighted]:bg-danger-soft" : "text-ink",
        className,
      )}
      {...props}
    >
      {icon ? <span className="inline-flex w-4 shrink-0 justify-center text-ink-3 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span> : null}
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? <kbd className="font-mono text-[11px] text-ink-3">{shortcut}</kbd> : null}
    </RadixDropdown.Item>
  );
}

export function DropdownCheckItem({ className, children, ...props }: React.ComponentProps<typeof RadixDropdown.CheckboxItem>) {
  return (
    <RadixDropdown.CheckboxItem
      className={cn("flex cursor-default select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] outline-none data-[highlighted]:bg-paper-3", className)}
      {...props}
    >
      <span className="inline-flex w-4 justify-center">
        <RadixDropdown.ItemIndicator>
          <Check className="h-3.5 w-3.5 text-accent" />
        </RadixDropdown.ItemIndicator>
      </span>
      <span className="flex-1 truncate">{children}</span>
    </RadixDropdown.CheckboxItem>
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentProps<typeof RadixDropdown.Label>) {
  return <RadixDropdown.Label className={cn("px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3", className)} {...props} />;
}

export function DropdownSeparator({ className, ...props }: React.ComponentProps<typeof RadixDropdown.Separator>) {
  return <RadixDropdown.Separator className={cn("-mx-1.5 my-1.5 h-px bg-line", className)} {...props} />;
}

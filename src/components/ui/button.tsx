"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/client/utils";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white shadow-[0_1px_0_rgba(0,0,0,.08),inset_0_1px_0_rgba(255,255,255,.18)] hover:bg-accent-ink",
        ai: "bg-ai text-white hover:bg-ai-ink",
        secondary: "bg-card text-ink border border-line-2 shadow-card hover:bg-card-2 hover:border-line-3",
        ghost: "text-ink-2 hover:bg-paper-3 hover:text-ink",
        soft: "bg-paper-3 text-ink hover:bg-line-2",
        danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
        ok: "bg-ok-soft text-ok hover:bg-ok hover:text-white",
        link: "text-accent-ink underline-offset-2 hover:underline",
      },
      size: {
        xs: "h-7 px-2 text-[12px] rounded-sm",
        sm: "h-8 px-2.5 text-[13px]",
        md: "h-9 px-3.5 text-[13.5px]",
        lg: "h-11 px-5 text-[15px] rounded-lg",
        icon: "h-8 w-8 p-0",
        "icon-sm": "h-7 w-7 p-0 rounded-sm",
        "icon-lg": "h-10 w-10 p-0 rounded-lg",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading, disabled, children, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
    {children}
  </button>
));
Button.displayName = "Button";

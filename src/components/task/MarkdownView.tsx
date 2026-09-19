"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/client/utils";

const COMPONENTS: Partial<Components> = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
  input: ({ checked, type }) => (type === "checkbox" ? <input type="checkbox" checked={!!checked} readOnly disabled aria-hidden /> : null),
};

/** Rendu Markdown (GFM) dans le style « atelier ». */
export const MarkdownView = React.memo(function MarkdownView({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("prose-atelier break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

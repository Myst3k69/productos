"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/client/utils";

/** Markdown compact pour les bulles de l'assistant. */
export function AssistantMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "text-[13px] leading-[1.55] text-ink-2 text-pretty",
        "[&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-ink",
        "[&_ul]:my-1.5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-0.5 [&_ul]:pl-4 [&_ul]:list-disc [&_ul]:marker:text-ink-4",
        "[&_ol]:my-1.5 [&_ol]:pl-4 [&_ol]:list-decimal",
        "[&_blockquote]:my-2 [&_blockquote]:rounded-r-md [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:bg-paper-2 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:text-ink",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: c }) =>
            href?.startsWith("/") ? (
              <Link href={href} className="font-medium text-accent-ink underline underline-offset-2">
                {c}
              </Link>
            ) : (
              <a href={href} target="_blank" rel="noreferrer" className="font-medium text-accent-ink underline underline-offset-2">
                {c}
              </a>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

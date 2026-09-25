"use client";

import type { CSSProperties } from "react";
import { Heart, Link2, MessageCircle } from "lucide-react";
import type { ClubPost } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { cn, timeAgo } from "@/lib/client/utils";
import { Avatar } from "./Avatar";
import { POST_KIND_META } from "./club-meta";

export function PostKindPill({ kind }: { kind: ClubPost["kind"] }) {
  const meta = POST_KIND_META[kind];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold leading-none", meta.className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </span>
  );
}

export function PostCard({ post, mine, index }: { post: ClubPost; mine: boolean; index: number }) {
  return (
    <article className="reveal rounded-xl border border-line bg-card p-4 shadow-card sm:p-5" style={{ "--i": index } as CSSProperties} aria-label={`Publication de ${post.author}`}>
      <header className="flex items-start gap-3">
        <Avatar initials={post.initials} size={38} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 text-[13.5px]">
            <span className="font-semibold text-ink">{post.author}</span>
            {mine ? <span className="rounded-sm bg-lime px-1 text-[10.5px] font-bold uppercase text-lime-ink">Vous</span> : null}
            <span className="text-ink-4" aria-hidden>
              ·
            </span>
            <time dateTime={post.at} className="text-[12px] text-ink-3">
              {timeAgo(post.at)}
            </time>
          </p>
          <p className="truncate text-[12px] text-ink-3">{post.role}</p>
        </div>
        <PostKindPill kind={post.kind} />
      </header>
      <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink text-pretty">{post.content}</p>
      {post.project ? (
        <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-md border border-line-2 bg-paper-2 px-2 py-1 text-[12px] text-ink-2">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
          <span className="truncate">{post.project}</span>
        </p>
      ) : null}
      <footer className="mt-3 flex items-center gap-1 border-t border-line pt-2">
        <button
          type="button"
          onClick={() => useBuildOS.getState().likePost(post.id)}
          aria-pressed={!!post.liked}
          aria-label={post.liked ? `Retirer votre soutien (${post.likes})` : `Soutenir (${post.likes})`}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors",
            post.liked ? "text-accent-ink hover:bg-accent-soft" : "text-ink-3 hover:bg-paper-2 hover:text-ink",
          )}
        >
          <Heart className={cn("h-4 w-4 transition-transform duration-200", post.liked && "scale-110 fill-accent text-accent")} aria-hidden />
          <span className="font-mono">{post.likes}</span>
        </button>
        <span className="inline-flex h-8 items-center gap-1.5 px-2 text-[13px] text-ink-3" aria-label={`${post.comments} commentaires`}>
          <MessageCircle className="h-4 w-4" aria-hidden />
          <span className="font-mono">{post.comments}</span>
        </span>
      </footer>
    </article>
  );
}

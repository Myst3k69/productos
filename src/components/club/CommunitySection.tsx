"use client";

import * as React from "react";
import { toast } from "sonner";
import { MessagesSquare, Send } from "lucide-react";
import type { ClubPost, FounderProfile } from "@/lib/buildos/types";
import type { Project } from "@/lib/domain/types";
import { useBuildOS } from "@/lib/buildos/store";
import { cn, modKey } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { Avatar, initialsOf } from "./Avatar";
import { POST_KIND_META } from "./club-meta";
import { PostCard } from "./PostCard";

const KINDS = Object.keys(POST_KIND_META) as ClubPost["kind"][];

/** Fil communautaire : composer en haut, filtres par type, soutiens et commentaires. */
export function CommunitySection({ posts, profile, project, focusKind, focusKey = 0 }: { posts: ClubPost[]; profile: FounderProfile | null; project: Project | null; focusKind?: ClubPost["kind"]; focusKey?: number }) {
  const [kind, setKind] = React.useState<ClubPost["kind"]>(focusKind ?? "build");
  const [content, setContent] = React.useState("");
  const [linkProject, setLinkProject] = React.useState(true);
  const [filter, setFilter] = React.useState<ClubPost["kind"] | "all">("all");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // « Publier mon avancement » (défi de la semaine) : type présélectionné et focus sur le champ.
  React.useEffect(() => {
    if (focusKind && focusKey) {
      setKind(focusKind);
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [focusKind, focusKey]);

  const name = profile?.name?.trim() || "Vous";
  const visible = filter === "all" ? posts : posts.filter((p) => p.kind === filter);
  const canPost = content.trim().length >= 3;

  function publish() {
    if (!canPost) return;
    useBuildOS.getState().addPost({ kind, content: content.trim(), project: linkProject && project ? project.name : undefined });
    setContent("");
    setFilter("all");
    toast.success("Publié dans la communauté", { description: "Les membres du Build Club peuvent vous répondre." });
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Nouvelle publication" className="rounded-xl border border-line-2 bg-card p-4 shadow-card sm:p-5">
        <div className="flex gap-3">
          <Avatar initials={initialsOf(name)} size={38} tone="bg-ink text-paper" />
          <div className="min-w-0 flex-1">
            <div role="radiogroup" aria-label="Type de publication" className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => {
                const meta = POST_KIND_META[k];
                const Icon = meta.icon;
                const active = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setKind(k)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium transition-colors",
                      active ? "border-ink bg-ink text-paper" : "border-line-2 bg-card text-ink-2 hover:border-line-3 hover:text-ink",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <label htmlFor="club-post" className="sr-only">
              Votre message
            </label>
            <textarea
              ref={inputRef}
              id="club-post"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  publish();
                }
              }}
              rows={3}
              placeholder={POST_KIND_META[kind].placeholder}
              className="mt-3 w-full resize-y rounded-md border border-line-2 bg-paper-2/60 px-3 py-2 text-[14px] leading-relaxed text-ink placeholder:text-ink-4 focus:border-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              {project ? (
                <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
                  <input type="checkbox" checked={linkProject} onChange={(e) => setLinkProject(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                  Lier mon projet <span className="max-w-[160px] truncate font-semibold text-ink sm:max-w-[240px]">{project.name}</span>
                </label>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <span className="hidden font-mono text-[11px] text-ink-4 sm:inline">{modKey()} + Entrée</span>
                <Button variant="ink" size="sm" onClick={publish} disabled={!canPost}>
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  Publier
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrer le fil">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Tout
        </FilterChip>
        {KINDS.map((k) => (
          <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)}>
            {POST_KIND_META[k].plural}
          </FilterChip>
        ))}
      </div>

      {visible.length ? (
        <div className="flex flex-col gap-3">
          {visible.map((p, i) => (
            <PostCard key={p.id} post={p} mine={p.role === "Membre BuildOS"} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<MessagesSquare />} title="Rien ici pour l'instant" description="Soyez la première personne à publier dans cette catégorie." />
      )}
    </div>
  );
}

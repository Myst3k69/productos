"use client";

import * as React from "react";
import { useBuildOS } from "@/lib/buildos/store";
import { useCurrentProject, useProjectTasks } from "@/lib/client/store";
import { cn } from "@/lib/client/utils";
import { AgendaSection } from "./AgendaSection";
import { ClubAside } from "./ClubAside";
import { ClubHero } from "./ClubHero";
import { CLUB_TABS, isPast, type ClubTab, type ExpertBooking } from "./club-meta";
import { loadMyBookings, recordExpertBooking } from "@/lib/client/supabase/buildos-sync";
import { CommunitySection } from "./CommunitySection";
import { ExpertsSection } from "./ExpertsSection";
import { JoinBanner } from "./JoinBanner";
import { LabsSection } from "./LabsSection";
import { StartupWeekSection } from "./StartupWeekSection";

const BOOKINGS_KEY = "buildos.club.bookings";
const TAB_IDS = CLUB_TABS.map((t) => t.value);

export function ClubView() {
  const project = useCurrentProject();
  const tasks = useProjectTasks();
  const profile = useBuildOS((s) => s.profile);
  const events = useBuildOS((s) => s.events);
  const labs = useBuildOS((s) => s.labs);
  const experts = useBuildOS((s) => s.experts);
  const posts = useBuildOS((s) => s.posts);

  const [tab, setTab] = React.useState<ClubTab>("agenda");
  const [composeNonce, setComposeNonce] = React.useState(0);
  const [bookings, setBookings] = React.useState<ExpertBooking[]>([]);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (project) useBuildOS.getState().ensureProject(project);
  }, [project]);

  // Lien profond : /club#experts, /club#startupweek…
  React.useEffect(() => {
    const h = window.location.hash.replace("#", "") as ClubTab;
    if (TAB_IDS.includes(h)) setTab(h);
    try {
      const raw = localStorage.getItem(BOOKINGS_KEY);
      if (raw) setBookings(JSON.parse(raw) as ExpertBooking[]);
    } catch {
      /* stockage indisponible */
    }
    // Avec un compte : les réservations viennent de la base.
    void loadMyBookings().then((list) => {
      if (!list) return;
      const names = new Map(useBuildOS.getState().experts.map((x) => [x.id, x.name]));
      setBookings(list.map((b) => ({ id: b.id, expertId: b.expertId, expertName: names.get(b.expertId) ?? "Expert", slot: b.slot, shared: b.shared, price: b.price, at: b.at })));
    });
  }, []);

  function go(t: ClubTab) {
    setTab(t);
    try {
      history.replaceState(null, "", `#${t}`);
    } catch {
      /* ignoré */
    }
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addBooking(b: ExpertBooking) {
    recordExpertBooking({ expertId: b.expertId, slot: b.slot, shared: b.shared, price: b.price });
    setBookings((prev) => {
      const next = [b, ...prev.filter((x) => x.expertId !== b.expertId)];
      try {
        localStorage.setItem(BOOKINGS_KEY, JSON.stringify(next));
      } catch {
        /* ignoré */
      }
      return next;
    });
  }

  const counts: Record<ClubTab, number | null> = {
    agenda: events.filter((e) => !isPast(e)).length,
    labs: labs.length,
    experts: experts.length,
    communaute: posts.length,
    startupweek: null,
  };
  const swEvent = events.find((e) => e.kind === "startupweek");

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 pb-16 pt-6 sm:px-6 md:px-8 md:pt-8">
        <ClubHero />
        {!profile?.joinedClub ? <JoinBanner /> : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_292px]">
          <div className="min-w-0">
            <div ref={tabsRef} className="sticky top-0 z-20 -mx-4 scroll-mt-0 border-b border-line bg-paper/90 px-4 backdrop-blur-md sm:mx-0 sm:px-0">
              <div role="tablist" aria-label="Rubriques du Build Club" className="scrollbar-none flex gap-1 overflow-x-auto">
                {CLUB_TABS.map((t) => {
                  const active = tab === t.value;
                  const count = counts[t.value];
                  return (
                    <button
                      key={t.value}
                      id={`club-tab-${t.value}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls="club-panel"
                      onClick={() => go(t.value)}
                      className={cn(
                        "relative -mb-px inline-flex h-12 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[14px] font-semibold transition-colors",
                        active ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink",
                      )}
                    >
                      {t.label}
                      {count != null ? <span className={cn("font-mono text-[11px]", active ? "text-ink-2" : "text-ink-4")}>{count}</span> : null}
                      {t.value === "startupweek" ? <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div id="club-panel" role="tabpanel" aria-labelledby={`club-tab-${tab}`} className="pt-6" key={tab}>
              <div className="reveal-fast">
                {tab === "agenda" ? <AgendaSection events={events} /> : null}
                {tab === "labs" ? <LabsSection labs={labs} /> : null}
                {tab === "experts" ? <ExpertsSection experts={experts} bookings={bookings} onBook={addBooking} /> : null}
                {tab === "communaute" ? <CommunitySection posts={posts} profile={profile} project={project} focusKind={composeNonce ? "build" : undefined} focusKey={composeNonce} /> : null}
                {tab === "startupweek" ? <StartupWeekSection event={swEvent} /> : null}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start" aria-label="Mon Build Club">
            <ClubAside
              events={events}
              labs={labs}
              bookings={bookings}
              posts={posts}
              tasks={tasks}
              onGo={go}
              onShare={() => {
                setComposeNonce((n) => n + 1);
                go("communaute");
              }}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

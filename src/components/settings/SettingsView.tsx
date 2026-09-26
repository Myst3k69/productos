"use client";

import { useSession } from "@/lib/client/supabase/session";
import { AccountSection } from "./AccountSection";
import { AiEngineSection } from "./AiEngineSection";
import { PrototypeSection } from "./PrototypeSection";
import { ProjectSection } from "./ProjectSection";
import { ShortcutsSection } from "./ShortcutsSection";
import { AboutSection } from "./AboutSection";
import { TeamSection } from "./TeamSection";

/** Page Réglages : compte et équipe (avec un compte), moteur IA, prototype, projet courant, raccourcis, à propos. */
export function SettingsView() {
  const cloud = useSession((s) => s.mode === "cloud");
  const offset = cloud ? 2 : 0;
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-9 px-5 pb-20 pt-6 sm:px-6">
        {cloud ? <AccountSection index={0} /> : null}
        {cloud ? <TeamSection index={1} /> : null}
        <AiEngineSection index={offset} />
        <PrototypeSection index={offset + 1} />
        <ProjectSection index={offset + 2} />
        <ShortcutsSection index={offset + 3} />
        <AboutSection index={offset + 4} />
      </div>
    </div>
  );
}

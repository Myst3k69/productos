"use client";

import { AiEngineSection } from "./AiEngineSection";
import { PrototypeSection } from "./PrototypeSection";
import { ProjectSection } from "./ProjectSection";
import { ShortcutsSection } from "./ShortcutsSection";
import { AboutSection } from "./AboutSection";

/** Page Réglages : moteur IA, prototype, projet courant, raccourcis, à propos. */
export function SettingsView() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-9 px-5 pb-20 pt-6 sm:px-6">
        <AiEngineSection index={0} />
        <PrototypeSection index={1} />
        <ProjectSection index={2} />
        <ShortcutsSection index={3} />
        <AboutSection index={4} />
      </div>
    </div>
  );
}

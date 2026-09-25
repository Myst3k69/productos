"use client";

import { HomeGreeting } from "./HomeGreeting";
import { JourneyStrip } from "./JourneyStrip";
import { TodoNow } from "./TodoNow";
import { AiWorking } from "./AiWorking";
import { KpiTiles } from "./KpiTiles";
import { FoundationsCard } from "./FoundationsCard";
import { AgentsCard } from "./AgentsCard";
import { ClubCard } from "./ClubCard";
import { HealthCard } from "./HealthCard";
import { useHomeData } from "./useHomeData";

const i = (n: number) => ({ "--i": n }) as React.CSSProperties;

/** Vue d'ensemble : le cockpit du fondateur, ce qu'il voit en arrivant chaque matin. */
export function HomeView() {
  const data = useHomeData();

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="@container/home mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-5 pb-10 pt-5">
        <HomeGreeting data={data} />
        <JourneyStrip data={data} index={1} />

        <div className="grid grid-cols-1 gap-4 @[1000px]/home:grid-cols-3">
          <TodoNow data={data} index={2} className="@[1000px]/home:col-span-2" style={i(2)} />
          <AiWorking data={data} index={3} style={i(3)} />
        </div>

        <KpiTiles data={data} startIndex={4} />

        <div className="grid grid-cols-1 gap-4 @[700px]/home:grid-cols-2 @[1000px]/home:grid-cols-3">
          <FoundationsCard data={data} index={4} style={i(8)} />
          <AgentsCard index={5} style={i(9)} />
          <ClubCard index={6} style={i(10)} />
        </div>

        <HealthCard data={data} index={7} style={i(11)} />
      </div>
    </div>
  );
}

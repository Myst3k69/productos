"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Plug } from "lucide-react";
import type { CodingAgent } from "@/lib/buildos/types";
import { useBuildOS } from "@/lib/buildos/store";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { AGENT_MONO, EXTRA_AGENTS, agentState } from "./agent-meta";
import { AgentLogo } from "./AgentLogo";

type ExtraState = "idle" | "loading" | "requested";

/** « Connecter un autre agent » : agents non connectés + intégrations en préversion (simulées). */
export function ConnectAgentDialog({ open, onOpenChange, agents }: { open: boolean; onOpenChange: (o: boolean) => void; agents: CodingAgent[] }) {
  const [extra, setExtra] = React.useState<Record<string, ExtraState>>({});
  const notConnected = agents.filter((a) => !a.connected);

  async function connectExtra(id: string, name: string) {
    setExtra((s) => ({ ...s, [id]: "loading" }));
    await new Promise((r) => setTimeout(r, 1200));
    setExtra((s) => ({ ...s, [id]: "requested" }));
    toast.success(`Demande de connexion à ${name} enregistrée`, { description: "L'intégration est en préversion : nous vous prévenons dès qu'elle est prête." });
  }

  async function connectKnown(a: CodingAgent) {
    await useBuildOS.getState().connectAgent(a.id);
    toast.success(`${a.name} est connecté`, { description: "Il reçoit désormais les tâches qui lui correspondent." });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="font-display text-[20px] font-black tracking-[-0.03em]">Connecter un autre agent</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] text-ink-2">Plus d&apos;agents, c&apos;est un routage plus fin et moins de temps d&apos;attente quand un quota est atteint.</DialogDescription>
        </DialogHeader>
        <DialogBody className="scrollbar-thin max-h-[62vh] overflow-y-auto">
          {notConnected.length ? (
            <>
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">Prêts à connecter</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {notConnected.map((a) => {
                  const loading = agentState(a) === "connecting";
                  return (
                    <Row key={a.id} mono={AGENT_MONO[a.id].mono} name={a.name} vendor={a.vendor} tagline={a.tagline}>
                      <Button variant="ink" size="sm" loading={loading} onClick={() => void connectKnown(a)}>
                        {!loading ? <Plug className="h-3.5 w-3.5" /> : null}
                        {loading ? "Connexion…" : "Connecter"}
                      </Button>
                    </Row>
                  );
                })}
              </ul>
            </>
          ) : null}
          <h3 className="mt-5 flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3 first:mt-0">
            Intégrations en préversion
            <Chip tone="lime" size="xs">
              Bientôt
            </Chip>
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {EXTRA_AGENTS.map((x) => {
              const st = extra[x.id] ?? "idle";
              return (
                <Row key={x.id} mono={x.mono} name={x.name} vendor={x.vendor} tagline={x.tagline}>
                  {st === "requested" ? (
                    <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ok-soft px-2.5 text-[12.5px] font-semibold text-ok">
                      <Check className="h-3.5 w-3.5" />
                      Demande envoyée
                    </span>
                  ) : (
                    <Button variant="secondary" size="sm" loading={st === "loading"} onClick={() => void connectExtra(x.id, x.name)}>
                      {st === "loading" ? "Connexion…" : "Connecter"}
                    </Button>
                  )}
                </Row>
              );
            })}
          </ul>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function Row({ mono, name, vendor, tagline, children }: { mono: string; name: string; vendor: string; tagline: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-card-2 px-3 py-2.5">
      <AgentLogo mono={mono} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13.5px] font-semibold text-ink">{name}</span>
          <span className="truncate text-[11.5px] text-ink-3">{vendor}</span>
        </div>
        <p className="truncate text-[12px] text-ink-3" title={tagline}>
          {tagline}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </li>
  );
}

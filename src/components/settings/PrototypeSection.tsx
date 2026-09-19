"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, RefreshCw, Trash2 } from "lucide-react";
import { useStore } from "@/lib/client/store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Section, SettingsCard } from "./Section";
import { SettingRow } from "./SettingRow";
import { MOCK_SPEED, formatSpeed } from "./options";
import { useSaveSettings } from "./useSaveSettings";

const TICKS = [0.5, 1, 2, 3, 4];

export function PrototypeSection({ index }: { index: number }) {
  const mockSpeed = useStore((s) => s.settings.mockSpeed);
  const reloadDemo = useStore((s) => s.reloadDemo);
  const resetAll = useStore((s) => s.resetAll);
  const save = useSaveSettings();
  const router = useRouter();

  const [speed, setSpeed] = useState(mockSpeed);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setSpeed(mockSpeed);
  }, [mockSpeed]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const onSpeed = (v: number) => {
    setSpeed(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save({ mockSpeed: v }, `Vitesse de simulation : ${formatSpeed(v)}`), 280);
  };

  const [confirm, setConfirm] = useState<"reload" | "reset" | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setBusy(true);
    try {
      await reloadDemo();
      toast.success("Démo rechargée", { description: "Le jeu de données est revenu à son état initial." });
      setConfirm(null);
      router.push("/board");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rechargement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await resetAll();
      toast("Tout a été effacé", { description: "Le prototype repart de zéro." });
      setConfirm(null);
      router.replace("/welcome");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Effacement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const pct = ((speed - MOCK_SPEED.min) / (MOCK_SPEED.max - MOCK_SPEED.min)) * 100;

  return (
    <Section index={index} title="Prototype" id="prototype">
      <div className="flex items-start gap-3 rounded-xl border border-violet/25 bg-violet-soft px-5 py-4">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-violet" aria-hidden />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-violet">Données simulées</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2 text-pretty">Ce prototype fait tourner une IA simulée pour valider l'usage. Aucun appel réel, aucun coût.</p>
        </div>
      </div>

      <SettingsCard>
        <SettingRow stack label="Vitesse de simulation" hint="Accélérez pour enchaîner les démonstrations, ralentissez pour observer chaque étape du pipeline." htmlFor="mock-speed">
          <div className="pt-1">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  id="mock-speed"
                  type="range"
                  min={MOCK_SPEED.min}
                  max={MOCK_SPEED.max}
                  step={MOCK_SPEED.step}
                  value={speed}
                  onChange={(e) => onSpeed(Number(e.target.value))}
                  aria-valuetext={formatSpeed(speed)}
                  className="block h-1.5 w-full cursor-pointer accent-violet"
                />
                <div className="relative mt-2 h-4 font-mono text-[10.5px] text-ink-4" aria-hidden>
                  {TICKS.map((t) => (
                    <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((t - MOCK_SPEED.min) / (MOCK_SPEED.max - MOCK_SPEED.min)) * 100}%` }}>
                      {formatSpeed(t)}
                    </span>
                  ))}
                </div>
              </div>
              <output htmlFor="mock-speed" className="num w-14 shrink-0 self-start text-right font-mono text-[15px] font-semibold text-violet">
                {formatSpeed(speed)}
              </output>
            </div>
            <p className="mt-1 text-[12px] text-ink-3">{pct <= 15 ? "Rythme réel : idéal pour lire le journal d'activité." : pct >= 70 ? "Rythme de démonstration : une tâche traverse le pipeline en quelques secondes." : "Rythme normal."}</p>
          </div>
        </SettingRow>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-ink">Jeu de données</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3 text-pretty">Deux projets, une vingtaine de tâches à tous les stades. Tout est stocké dans ce navigateur.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm("reload")}>
              <RefreshCw className="h-3.5 w-3.5" />
              Recharger la démo
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirm("reset")}>
              <Trash2 className="h-3.5 w-3.5" />
              Tout effacer
            </Button>
          </div>
        </div>
      </SettingsCard>

      <ConfirmDialog
        open={confirm === "reload"}
        onOpenChange={(o) => setConfirm(o ? "reload" : null)}
        tone="accent"
        title="Recharger la démo ?"
        description="Le jeu de démonstration revient à son état initial. Vos projets et tâches actuels seront remplacés."
        confirmLabel="Recharger la démo"
        loading={busy}
        onConfirm={reload}
      />
      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(o) => setConfirm(o ? "reset" : null)}
        tone="danger"
        title="Tout effacer ?"
        description="Tous les projets, tâches, journaux et artefacts stockés dans ce navigateur seront supprimés. Cette action est irréversible."
        confirmLabel="Tout effacer"
        loading={busy}
        onConfirm={reset}
      />
    </Section>
  );
}

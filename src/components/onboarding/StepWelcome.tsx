"use client";

import * as React from "react";
import { Briefcase, Code2, GraduationCap, Hammer, Lightbulb, Rocket, Sparkles, User, Users, Wrench, BadgeCheck, Building2 } from "lucide-react";
import type { FounderRole, ProjectStage, TechLevel } from "@/lib/buildos/types";
import { Input } from "@/components/ui/input";
import { OptionCard } from "./OptionCard";
import { StepHeading } from "./StepHeading";
import { ROLE_OPTIONS, STAGE_OPTIONS, TECH_OPTIONS, type StepProps } from "./draft";

const ROLE_ICON: Record<FounderRole, React.ReactNode> = {
  solo: <User />,
  cofounder: <Users />,
  freelance: <Briefcase />,
  intrapreneur: <Building2 />,
  student: <GraduationCap />,
};
const TECH_ICON: Record<TechLevel, React.ReactNode> = { none: <Sparkles />, some: <Wrench />, dev: <Code2 /> };
const STAGE_ICON: Record<ProjectStage, React.ReactNode> = { idea: <Lightbulb />, validated: <BadgeCheck />, prototype: <Hammer />, live: <Rocket /> };

const rv = (i: number) => ({ "--i": i }) as React.CSSProperties;

function Group({ label, children, i }: { label: string; children: React.ReactNode; i: number }) {
  return (
    <fieldset className="reveal flex flex-col gap-2.5" style={rv(i)}>
      <legend className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</legend>
      {children}
    </fieldset>
  );
}

export function StepWelcome({ draft, update, index }: StepProps) {
  const hours = draft.hoursPerWeek;
  const hoursHint = hours <= 5 ? "Un rythme de soirées : on priorise l'essentiel." : hours <= 15 ? "Un bon rythme pour sortir une v1 en quelques semaines." : hours <= 30 ? "De quoi avancer vite, façon StartupWeek." : "Plein temps : on met les bouchées doubles.";

  return (
    <div className="flex flex-col gap-9">
      <StepHeading
        index={index}
        eyebrow="Bienvenue dans BuildOS"
        title={
          <>
            Construisons votre <span className="marker-underline">projet</span>.
          </>
        }
        lead="Trois minutes, quelques questions, et vous repartez avec un projet structuré, vos fondations rédigées et l'IA déjà au travail."
      />

      <div className="reveal flex flex-col gap-2" style={rv(3)}>
        <label htmlFor="onb-name" className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          Comment vous appelez-vous ?
        </label>
        <Input
          id="onb-name"
          autoFocus
          autoComplete="given-name"
          placeholder="Votre prénom"
          value={draft.name}
          maxLength={40}
          onChange={(e) => update({ name: e.target.value })}
          className="h-14 border-line-3 font-display text-[24px] font-bold tracking-[-0.03em] placeholder:font-sans placeholder:text-[18px] placeholder:font-normal placeholder:tracking-normal"
        />
      </div>

      <Group label="Vous êtes…" i={4}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_OPTIONS.map((o) => (
            <OptionCard key={o.value} size="sm" selected={draft.role === o.value} onSelect={() => update({ role: o.value })} label={o.label} hint={o.hint} icon={ROLE_ICON[o.value]} />
          ))}
        </div>
      </Group>

      <Group label="Votre rapport au code" i={5}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TECH_OPTIONS.map((o) => (
            <OptionCard key={o.value} size="sm" selected={draft.techLevel === o.value} onSelect={() => update({ techLevel: o.value })} label={o.label} hint={o.hint} icon={TECH_ICON[o.value]} />
          ))}
        </div>
      </Group>

      <Group label="Où en est le projet ?" i={6}>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {STAGE_OPTIONS.map((o) => (
            <OptionCard key={o.value} size="sm" selected={draft.stage === o.value} onSelect={() => update({ stage: o.value })} label={o.label} hint={o.hint} icon={STAGE_ICON[o.value]} />
          ))}
        </div>
      </Group>

      <Group label="Temps disponible par semaine" i={7}>
        <div className="flex flex-col gap-3 rounded-md border border-line-2 bg-card px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-[34px] font-black leading-none tracking-[-0.04em] text-ink">
              <span className="num">{hours}</span>
              <span className="ml-1 text-[16px] font-bold text-ink-3">h / semaine</span>
            </p>
            <p className="text-right text-[12.5px] text-ink-3">{hoursHint}</p>
          </div>
          <input
            type="range"
            min={2}
            max={50}
            step={1}
            value={hours}
            aria-label="Heures disponibles par semaine"
            aria-valuetext={`${hours} heures par semaine`}
            onChange={(e) => update({ hoursPerWeek: Number(e.target.value) })}
            className="h-7 w-full cursor-pointer accent-accent"
          />
          <div className="flex justify-between font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-4">
            <span>Soirées</span>
            <span>Mi-temps</span>
            <span>Plein temps</span>
          </div>
        </div>
      </Group>
    </div>
  );
}

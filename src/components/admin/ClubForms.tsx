"use client";

import * as React from "react";
import { format } from "date-fns";
import { EVENT_KIND_META } from "@/components/club/club-meta";
import type { ClubEventKind } from "@/lib/buildos/types";
import type { ClubEventRow, ClubLabRow, ExpertRow } from "@/lib/supabase/database.types";
import { initials } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/input";
import { adminAction } from "./admin-data";

const KINDS = Object.keys(EVENT_KIND_META) as ClubEventKind[];
const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function FormDialog({ open, onClose, title, busy, onSubmit, children }: { open: boolean; onClose: () => void; title: string; busy: boolean; onSubmit: () => void; children: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" aria-describedby={undefined}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-[18px] font-extrabold tracking-[-0.03em]">{title}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid max-h-[62vh] gap-4 overflow-y-auto sm:grid-cols-2">{children}</DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="ink" loading={busy}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PublishedField({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2.5 sm:col-span-2">
      <Switch checked={value} onCheckedChange={onChange} label="Publié" />
      <span className="text-[13px] text-ink-2">{value ? "Publié : visible par les membres" : "Brouillon : visible par les admins seulement"}</span>
    </div>
  );
}

/* ─────────────────────────── Événements ─────────────────────────── */

export function EventDialog({ event, open, onClose, onSaved }: { event: ClubEventRow | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = React.useState(() => blankEvent());
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setF(
      event
        ? {
            kind: event.kind,
            title: event.title,
            description: event.description,
            startsAt: format(new Date(event.starts_at), "yyyy-MM-dd'T'HH:mm"),
            duration: String(event.duration_min),
            host: event.host,
            price: String(event.price),
            seats: String(event.seats),
            tags: event.tags.join(", "),
            location: event.location,
            published: event.published,
          }
        : blankEvent(),
    );
  }, [open, event]);

  const set = <K extends keyof ReturnType<typeof blankEvent>>(k: K, v: ReturnType<typeof blankEvent>[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!f.title.trim() || !f.startsAt) return;
    const row = {
      kind: f.kind,
      title: f.title.trim(),
      description: f.description.trim(),
      starts_at: new Date(f.startsAt).toISOString(),
      duration_min: Math.max(5, Number(f.duration) || 60),
      host: f.host.trim(),
      price: Math.max(0, Math.round(Number(f.price) || 0)),
      seats: Math.max(0, Math.round(Number(f.seats) || 0)),
      tags: splitList(f.tags),
      location: f.location.trim() || "En ligne",
      published: f.published,
    };
    setBusy(true);
    const ok = await adminAction(
      (sb) => (event ? sb.from("club_events").update(row).eq("id", event.id) : sb.from("club_events").insert(row)),
      event ? "Événement mis à jour" : "Événement créé",
      onSaved,
    );
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <FormDialog open={open} onClose={onClose} title={event ? "Modifier l'événement" : "Nouvel événement"} busy={busy} onSubmit={() => void submit()}>
      <Field label="Titre" htmlFor="ev-title" className="sm:col-span-2">
        <Input id="ev-title" required value={f.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label="Format" htmlFor="ev-kind">
        <Select id="ev-kind" value={f.kind} onChange={(e) => set("kind", e.target.value)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {EVENT_KIND_META[k].label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Date et heure (heure locale)" htmlFor="ev-date">
        <Input id="ev-date" type="datetime-local" required value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
      </Field>
      <Field label="Description" htmlFor="ev-desc" className="sm:col-span-2">
        <Textarea id="ev-desc" value={f.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <Field label="Animé par" htmlFor="ev-host">
        <Input id="ev-host" value={f.host} onChange={(e) => set("host", e.target.value)} />
      </Field>
      <Field label="Lieu" htmlFor="ev-loc">
        <Input id="ev-loc" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="En ligne" />
      </Field>
      <Field label="Durée (min)" htmlFor="ev-dur">
        <Input id="ev-dur" type="number" min={5} value={f.duration} onChange={(e) => set("duration", e.target.value)} />
      </Field>
      <Field label="Places" htmlFor="ev-seats" hint={event ? `${event.seats_taken} déjà prise${event.seats_taken > 1 ? "s" : ""}` : undefined}>
        <Input id="ev-seats" type="number" min={0} value={f.seats} onChange={(e) => set("seats", e.target.value)} />
      </Field>
      <Field label="Prix (€, 0 = gratuit)" htmlFor="ev-price">
        <Input id="ev-price" type="number" min={0} value={f.price} onChange={(e) => set("price", e.target.value)} />
      </Field>
      <Field label="Étiquettes (séparées par des virgules)" htmlFor="ev-tags">
        <Input id="ev-tags" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Produit, Débutant" />
      </Field>
      <PublishedField value={f.published} onChange={(v) => set("published", v)} />
    </FormDialog>
  );
}

function blankEvent() {
  const d = new Date(Date.now() + 7 * 86_400_000);
  d.setHours(18, 0, 0, 0);
  return { kind: "atelier", title: "", description: "", startsAt: format(d, "yyyy-MM-dd'T'HH:mm"), duration: "60", host: "", price: "0", seats: "30", tags: "", location: "En ligne", published: true };
}

/* ─────────────────────────── Labs ─────────────────────────── */

export function LabDialog({ lab, open, onClose, onSaved }: { lab: ClubLabRow | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = React.useState({ name: "", theme: "", cadence: "", published: true });
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (open) setF(lab ? { name: lab.name, theme: lab.theme, cadence: lab.cadence, published: lab.published } : { name: "", theme: "", cadence: "Chaque semaine", published: true });
  }, [open, lab]);

  async function submit() {
    if (!f.name.trim()) return;
    const row = { name: f.name.trim(), theme: f.theme.trim(), cadence: f.cadence.trim(), published: f.published };
    setBusy(true);
    const ok = await adminAction((sb) => (lab ? sb.from("club_labs").update(row).eq("id", lab.id) : sb.from("club_labs").insert(row)), lab ? "Lab mis à jour" : "Lab créé", onSaved);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <FormDialog open={open} onClose={onClose} title={lab ? "Modifier le lab" : "Nouveau lab"} busy={busy} onSubmit={() => void submit()}>
      <Field label="Nom" htmlFor="lab-name">
        <Input id="lab-name" required value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="Lab Growth" />
      </Field>
      <Field label="Rythme" htmlFor="lab-cadence">
        <Input id="lab-cadence" value={f.cadence} onChange={(e) => setF((s) => ({ ...s, cadence: e.target.value }))} placeholder="Chaque lundi" />
      </Field>
      <Field label="Thème" htmlFor="lab-theme" className="sm:col-span-2">
        <Input id="lab-theme" value={f.theme} onChange={(e) => setF((s) => ({ ...s, theme: e.target.value }))} />
      </Field>
      <PublishedField value={f.published} onChange={(v) => setF((s) => ({ ...s, published: v }))} />
    </FormDialog>
  );
}

/* ─────────────────────────── Experts ─────────────────────────── */

const BLANK_EXPERT = { name: "", role: "", skills: "", rate: "110", rating: "5", sessions: "0", available: "", published: true, sort: "10" };

export function ExpertDialog({ expert, open, onClose, onSaved }: { expert: ExpertRow | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = React.useState(BLANK_EXPERT);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setF(
      expert
        ? {
            name: expert.name,
            role: expert.role,
            skills: expert.skills.join(", "),
            rate: String(expert.rate),
            rating: String(expert.rating),
            sessions: String(expert.sessions),
            available: expert.available,
            published: expert.published,
            sort: String(expert.sort),
          }
        : BLANK_EXPERT,
    );
  }, [open, expert]);
  const set = (k: keyof typeof BLANK_EXPERT, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!f.name.trim()) return;
    const row = {
      name: f.name.trim(),
      initials: initials(f.name.trim()),
      role: f.role.trim(),
      skills: splitList(f.skills),
      rate: Math.max(0, Math.round(Number(f.rate) || 0)),
      rating: Math.min(5, Math.max(0, Number(f.rating) || 0)),
      sessions: Math.max(0, Math.round(Number(f.sessions) || 0)),
      available: f.available.trim(),
      published: f.published,
      sort: Math.round(Number(f.sort) || 0),
    };
    setBusy(true);
    const ok = await adminAction((sb) => (expert ? sb.from("experts").update(row).eq("id", expert.id) : sb.from("experts").insert(row)), expert ? "Expert mis à jour" : "Expert ajouté", onSaved);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <FormDialog open={open} onClose={onClose} title={expert ? "Modifier l'expert" : "Nouvel expert"} busy={busy} onSubmit={() => void submit()}>
      <Field label="Nom" htmlFor="x-name">
        <Input id="x-name" required value={f.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Rôle" htmlFor="x-role">
        <Input id="x-role" value={f.role} onChange={(e) => set("role", e.target.value)} placeholder="CTO freelance" />
      </Field>
      <Field label="Compétences (virgules)" htmlFor="x-skills" className="sm:col-span-2">
        <Input id="x-skills" value={f.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Architecture, Supabase" />
      </Field>
      <Field label="Tarif horaire (€)" htmlFor="x-rate">
        <Input id="x-rate" type="number" min={0} value={f.rate} onChange={(e) => set("rate", e.target.value)} />
      </Field>
      <Field label="Prochaine disponibilité" htmlFor="x-avail">
        <Input id="x-avail" value={f.available} onChange={(e) => set("available", e.target.value)} placeholder="Demain 12:00" />
      </Field>
      <Field label="Note (0–5)" htmlFor="x-rating">
        <Input id="x-rating" type="number" min={0} max={5} step={0.1} value={f.rating} onChange={(e) => set("rating", e.target.value)} />
      </Field>
      <Field label="Sessions réalisées" htmlFor="x-sessions">
        <Input id="x-sessions" type="number" min={0} value={f.sessions} onChange={(e) => set("sessions", e.target.value)} />
      </Field>
      <Field label="Ordre d'affichage" htmlFor="x-sort">
        <Input id="x-sort" type="number" value={f.sort} onChange={(e) => set("sort", e.target.value)} />
      </Field>
      <PublishedField value={f.published} onChange={(v) => set("published", v)} />
    </FormDialog>
  );
}

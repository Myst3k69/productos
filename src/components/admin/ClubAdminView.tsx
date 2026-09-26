"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Eye, EyeOff, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { EVENT_KIND_META, POST_KIND_META } from "@/components/club/club-meta";
import type { ClubEventKind } from "@/lib/buildos/types";
import { timeAgo } from "@/lib/client/utils";
import type { AdminBookingRow, ClubEventRow, ClubLabRow, ClubPostRow, ExpertRow } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminHeader } from "./AdminShell";
import { AdminCard, AdminPage, ErrorNote, LoadingRows, Td, Th } from "./AdminBits";
import { EventDialog, ExpertDialog, LabDialog } from "./ClubForms";
import { adminAction, eur, useAdminData } from "./admin-data";

type Tab = "events" | "labs" | "experts" | "posts" | "bookings";

export function ClubAdminView() {
  const [tab, setTab] = React.useState<Tab>("events");
  return (
    <>
      <AdminHeader badge="05" title="Build Club" subtitle="Ateliers, labs, experts, communauté : ce que voient les membres dans l'onglet Build Club." />
      <AdminPage>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "events", label: "Événements" },
            { value: "labs", label: "Labs" },
            { value: "experts", label: "Experts" },
            { value: "posts", label: "Communauté" },
            { value: "bookings", label: "Réservations" },
          ]}
          className="w-fit max-w-full overflow-x-auto"
        />
        {tab === "events" ? <EventsTab /> : tab === "labs" ? <LabsTab /> : tab === "experts" ? <ExpertsTab /> : tab === "posts" ? <PostsTab /> : <BookingsTab />}
      </AdminPage>
    </>
  );
}

function kindLabel(kind: string) {
  return EVENT_KIND_META[kind as ClubEventKind]?.label ?? kind;
}

/* ─────────────────────────── Événements ─────────────────────────── */

function EventsTab() {
  const events = useAdminData<ClubEventRow[]>((sb) => sb.from("club_events").select("*").order("starts_at"));
  const [editing, setEditing] = React.useState<ClubEventRow | null | "new">(null);
  const [removing, setRemoving] = React.useState<ClubEventRow | null>(null);
  const [attendees, setAttendees] = React.useState<ClubEventRow | null>(null);

  return (
    <AdminCard
      title={`${events.data?.length ?? "…"} événements`}
      right={
        <Button variant="ink" size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> Nouvel événement
        </Button>
      }
    >
      {events.error ? <ErrorNote message={events.error} onRetry={() => void events.reload()} /> : null}
      {!events.data ? (
        <LoadingRows />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="border-b border-line">
              <tr>
                <Th>Événement</Th>
                <Th>Date</Th>
                <Th align="right">Places</Th>
                <Th align="right">Prix</Th>
                <Th>État</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.data.map((e) => {
                const past = new Date(e.starts_at).getTime() < Date.now();
                return (
                  <tr key={e.id}>
                    <Td>
                      <span className="block truncate font-medium text-ink">{e.title}</span>
                      <span className="text-[12px] text-ink-3">
                        {kindLabel(e.kind)} · {e.host || "—"} · {e.location}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-ink-2">{format(new Date(e.starts_at), "EEE d MMM · HH:mm", { locale: fr })}</Td>
                    <Td align="right" className="num font-mono">
                      {e.seats_taken}/{e.seats}
                    </Td>
                    <Td align="right" className="num font-mono">
                      {e.price ? eur(e.price) : "Gratuit"}
                    </Td>
                    <Td>
                      {!e.published ? <Chip tone="outline" size="xs">Brouillon</Chip> : past ? <Chip tone="neutral" size="xs">Passé</Chip> : e.seats_taken >= e.seats ? <Chip tone="accent" size="xs">Complet</Chip> : <Chip tone="ok" size="xs">Ouvert</Chip>}
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`Inscrits à ${e.title}`} onClick={() => setAttendees(e)}>
                          <Users className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Modifier ${e.title}`} onClick={() => setEditing(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Supprimer ${e.title}`} onClick={() => setRemoving(e)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <EventDialog open={editing !== null} event={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => void events.reload()} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Supprimer « ${removing?.title ?? ""} » ?`}
        description="L'événement et ses inscriptions sont supprimés. Préférez « Brouillon » pour le masquer sans rien perdre."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (removing) await adminAction((sb) => sb.from("club_events").delete().eq("id", removing.id), "Événement supprimé", () => events.reload());
          setRemoving(null);
        }}
      />
      <AttendeesDialog event={attendees} onClose={() => setAttendees(null)} />
    </AdminCard>
  );
}

function AttendeesDialog({ event, onClose }: { event: ClubEventRow | null; onClose: () => void }) {
  const id = event?.id ?? "";
  const list = useAdminData((sb) => (id ? sb.rpc("admin_event_registrations", { event_id: id }) : Promise.resolve({ data: [], error: null })), [id]);
  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-[18px] font-extrabold tracking-[-0.03em]">Inscrits · {event?.title}</DialogTitle>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {event ? `${event.seats_taken} place${event.seats_taken > 1 ? "s" : ""} prise${event.seats_taken > 1 ? "s" : ""} sur ${event.seats}, dont les inscriptions historiques du prototype.` : ""}
          </p>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] overflow-y-auto">
          {!list.data ? (
            <LoadingRows rows={3} />
          ) : list.data.length ? (
            <ul className="divide-y divide-line">
              {list.data.map((r) => (
                <li key={r.user_id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{r.name || r.email}</span> <span className="text-ink-3">{r.email}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-3">{timeAgo(r.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-3">Aucun inscrit avec un compte pour l&apos;instant.</p>
          )}
          {list.data?.length ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => void navigator.clipboard?.writeText(list.data!.map((r) => r.email).join(", "))}
            >
              Copier les e-mails
            </Button>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Labs ─────────────────────────── */

function LabsTab() {
  const labs = useAdminData<ClubLabRow[]>((sb) => sb.from("club_labs").select("*").order("created_at"));
  const [editing, setEditing] = React.useState<ClubLabRow | null | "new">(null);
  const [removing, setRemoving] = React.useState<ClubLabRow | null>(null);
  return (
    <AdminCard
      title={`${labs.data?.length ?? "…"} labs`}
      right={
        <Button variant="ink" size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> Nouveau lab
        </Button>
      }
    >
      {labs.error ? <ErrorNote message={labs.error} /> : null}
      {!labs.data ? (
        <LoadingRows />
      ) : (
        <ul className="divide-y divide-line">
          {labs.data.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink">
                  {l.name} {!l.published ? <Chip tone="outline" size="xs">Brouillon</Chip> : null}
                </p>
                <p className="truncate text-[12px] text-ink-3">
                  {l.theme} · {l.cadence} · {l.members_count} membres
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Modifier ${l.name}`} onClick={() => setEditing(l)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Supprimer ${l.name}`} onClick={() => setRemoving(l)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <LabDialog open={editing !== null} lab={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => void labs.reload()} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Supprimer « ${removing?.name ?? ""} » ?`}
        description="Le lab et la liste de ses membres sont supprimés."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (removing) await adminAction((sb) => sb.from("club_labs").delete().eq("id", removing.id), "Lab supprimé", () => labs.reload());
          setRemoving(null);
        }}
      />
    </AdminCard>
  );
}

/* ─────────────────────────── Experts ─────────────────────────── */

function ExpertsTab() {
  const experts = useAdminData<ExpertRow[]>((sb) => sb.from("experts").select("*").order("sort"));
  const [editing, setEditing] = React.useState<ExpertRow | null | "new">(null);
  const [removing, setRemoving] = React.useState<ExpertRow | null>(null);
  return (
    <AdminCard
      title={`${experts.data?.length ?? "…"} experts`}
      right={
        <Button variant="ink" size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> Nouvel expert
        </Button>
      }
    >
      {experts.error ? <ErrorNote message={experts.error} /> : null}
      {!experts.data ? (
        <LoadingRows />
      ) : (
        <ul className="divide-y divide-line">
          {experts.data.map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-4 py-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-3 font-display text-[12px] font-extrabold" aria-hidden>
                {x.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink">
                  {x.name} {!x.published ? <Chip tone="outline" size="xs">Masqué</Chip> : null}
                </p>
                <p className="truncate text-[12px] text-ink-3">
                  {x.role} · {eur(x.rate)}/h · ★ {x.rating.toLocaleString("fr-FR")} · {x.skills.join(", ")}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Modifier ${x.name}`} onClick={() => setEditing(x)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Supprimer ${x.name}`} onClick={() => setRemoving(x)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ExpertDialog open={editing !== null} expert={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => void experts.reload()} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Supprimer ${removing?.name ?? ""} ?`}
        description="La fiche et ses réservations sont supprimées. Préférez « Masqué » pour une indisponibilité temporaire."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (removing) await adminAction((sb) => sb.from("experts").delete().eq("id", removing.id), "Expert supprimé", () => experts.reload());
          setRemoving(null);
        }}
      />
    </AdminCard>
  );
}

/* ─────────────────────────── Communauté ─────────────────────────── */

function PostsTab() {
  const posts = useAdminData<ClubPostRow[]>((sb) => sb.from("club_posts").select("*").order("created_at", { ascending: false }).limit(200));
  const [filter, setFilter] = React.useState<"all" | "hidden">("all");
  const [removing, setRemoving] = React.useState<ClubPostRow | null>(null);
  const list = (posts.data ?? []).filter((p) => filter === "all" || p.hidden);

  const moderate = (p: ClubPostRow, hide: boolean) => {
    const reason = hide ? (window.prompt("Motif du masquage (facultatif, visible par l'auteur) :") ?? "") : "";
    void adminAction((sb) => sb.rpc("admin_moderate_post", { post_id: p.id, hide, reason }), hide ? "Publication masquée" : "Publication rétablie", () => posts.reload());
  };

  return (
    <AdminCard title="Publications de la communauté" right={<Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: "all", label: "Toutes" }, { value: "hidden", label: "Masquées" }]} />}>
      {posts.error ? <ErrorNote message={posts.error} /> : null}
      {!posts.data ? (
        <LoadingRows />
      ) : list.length ? (
        <ul className="divide-y divide-line">
          {list.map((p) => (
            <li key={p.id} className="flex gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-ink-3">
                  <span className="font-semibold text-ink">{p.author_name}</span> · {POST_KIND_META[p.kind]?.label ?? p.kind} · {timeAgo(p.created_at)} · {p.likes_count} j&apos;aime
                  {p.hidden ? (
                    <Chip tone="danger" size="xs" className="ml-2">
                      Masquée{p.hidden_reason ? ` : ${p.hidden_reason}` : ""}
                    </Chip>
                  ) : null}
                </p>
                <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-ink-2">{p.content}</p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <Button variant="ghost" size="icon-sm" aria-label={p.hidden ? "Rétablir la publication" : "Masquer la publication"} onClick={() => moderate(p, !p.hidden)}>
                  {p.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Supprimer la publication" onClick={() => setRemoving(p)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-[13px] text-ink-3">Rien à modérer.</p>
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Supprimer la publication ?"
        description="Suppression définitive. Pour une modération réversible, masquez-la."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (removing) await adminAction((sb) => sb.from("club_posts").delete().eq("id", removing.id), "Publication supprimée", () => posts.reload());
          setRemoving(null);
        }}
      />
    </AdminCard>
  );
}

/* ─────────────────────────── Réservations ─────────────────────────── */

const BOOKING_LABEL: Record<string, string> = { requested: "À confirmer", confirmed: "Confirmée", cancelled: "Annulée" };

function BookingsTab() {
  const bookings = useAdminData<AdminBookingRow[]>((sb) => sb.rpc("admin_list_bookings"));
  const setStatus = (b: AdminBookingRow, status: "confirmed" | "cancelled") =>
    void adminAction((sb) => sb.rpc("admin_set_booking_status", { booking_id: b.id, new_status: status }), status === "confirmed" ? "Réservation confirmée" : "Réservation annulée", () => bookings.reload());

  return (
    <AdminCard title="Réservations d'experts">
      {bookings.error ? <ErrorNote message={bookings.error} /> : null}
      {!bookings.data ? (
        <LoadingRows />
      ) : bookings.data.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-[13px]">
            <thead className="border-b border-line">
              <tr>
                <Th>Membre</Th>
                <Th>Expert</Th>
                <Th>Créneau</Th>
                <Th align="right">Prix</Th>
                <Th>Statut</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bookings.data.map((b) => (
                <tr key={b.id}>
                  <Td>
                    <span className="block truncate font-medium">{b.user_name || b.user_email}</span>
                    <span className="block truncate text-[12px] text-ink-3">{b.user_email}</span>
                  </Td>
                  <Td>{b.expert_name}</Td>
                  <Td className="text-ink-2">
                    {b.slot}
                    {b.shared ? <span className="text-ink-4"> · partagée</span> : null}
                  </Td>
                  <Td align="right" className="num font-mono">
                    {eur(b.price)}
                  </Td>
                  <Td>
                    <Chip size="xs" tone={b.status === "confirmed" ? "ok" : b.status === "cancelled" ? "outline" : "accent"}>
                      {BOOKING_LABEL[b.status] ?? b.status}
                    </Chip>
                  </Td>
                  <Td align="right">
                    {b.status === "requested" ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ok" size="xs" onClick={() => setStatus(b, "confirmed")}>
                          <Check className="h-3 w-3" /> Confirmer
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => setStatus(b, "cancelled")}>
                          <X className="h-3 w-3" /> Annuler
                        </Button>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-[13px] text-ink-3">Aucune réservation pour l&apos;instant.</p>
      )}
    </AdminCard>
  );
}

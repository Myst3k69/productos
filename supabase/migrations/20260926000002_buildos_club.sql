-- BuildOS — données par projet (brief, fondations, mises en prod, audits, parcours),
-- registre de consommation IA et Build Club (contenus gérés par les admins).

/* ═══════════════════════════ Données BuildOS par projet ═══════════════════════════ */

create table public.project_briefs (
  project_id text primary key references public.projects (id) on delete cascade,
  pitch text not null default '',
  audience text not null default '',
  problem text not null default '',
  features jsonb not null default '[]'::jsonb,
  constraints text not null default '',
  app_type text not null default 'saas',
  created_at timestamptz not null default now()
);

create table public.deliverables (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  kind text not null,
  title text not null,
  summary text not null default '',
  status text not null default 'todo',
  version integer not null default 1,
  content text not null default '',
  format text not null default 'markdown',
  updated_at timestamptz not null default now(),
  unique (project_id, kind)
);

create table public.releases (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  version text not null,
  title text not null,
  env text not null default 'dev',
  status text not null default 'running',
  items jsonb not null default '[]'::jsonb,
  checks jsonb not null default '[]'::jsonb,
  url text,
  reviewer text,
  created_at timestamptz not null default now()
);
create index releases_project_idx on public.releases (project_id);

create table public.audit_reports (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  date timestamptz not null default now(),
  category text not null,
  score integer not null default 0,
  summary text not null default '',
  findings jsonb not null default '[]'::jsonb
);
create index audit_reports_project_idx on public.audit_reports (project_id);

create table public.journey_steps (
  project_id text not null references public.projects (id) on delete cascade,
  id text not null,
  day integer not null,
  title text not null,
  outcome text not null default '',
  href text not null default '/home',
  done boolean not null default false,
  primary key (project_id, id)
);

do $$
declare
  t text;
begin
  foreach t in array array['project_briefs', 'deliverables', 'releases', 'audit_reports', 'journey_steps'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_project_member(project_id) or public.is_admin())', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit_project(project_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_edit_project(project_id))', t || '_delete', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

/* ═══════════════════════════ Consommation IA ═══════════════════════════ */
-- Chaque hausse du coût d'une tâche est inscrite au registre, imputée au propriétaire du projet
-- (c'est lui qui consomme son quota). Base du suivi mensuel et des quotas.

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  project_id text references public.projects (id) on delete set null,
  task_id text references public.tasks (id) on delete set null,
  cost_usd double precision not null,
  tokens bigint not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_user_month_idx on public.ai_usage (user_id, created_at);
create index ai_usage_created_idx on public.ai_usage (created_at);

create or replace function public.record_ai_usage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cost_usd > old.cost_usd then
    insert into public.ai_usage (user_id, project_id, task_id, cost_usd, tokens)
    select p.owner_id, new.project_id, new.id, new.cost_usd - old.cost_usd,
           greatest(0, (new.input_tokens + new.output_tokens) - (old.input_tokens + old.output_tokens))
    from public.projects p where p.id = new.project_id;
  end if;
  return new;
end;
$$;

create trigger tasks_record_usage after update of cost_usd on public.tasks
  for each row execute function public.record_ai_usage();

alter table public.ai_usage enable row level security;
create policy ai_usage_select on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.ai_usage from anon, authenticated;

-- Consommation du mois en cours et quota du compte courant
create or replace function public.my_ai_usage()
returns table (month_cost_usd double precision, quota_usd numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select sum(u.cost_usd) from public.ai_usage u
                    where u.user_id = auth.uid() and u.created_at >= date_trunc('month', now())), 0),
         (select p.ai_quota_usd from public.profiles p where p.id = auth.uid());
$$;

revoke execute on function public.my_ai_usage() from public, anon;
grant execute on function public.my_ai_usage() to authenticated;

/* ═══════════════════════════ Build Club ═══════════════════════════ */

create table public.club_events (
  id text primary key default ('ev_' || substr(md5(gen_random_uuid()::text), 1, 10)),
  kind text not null default 'atelier',
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  duration_min integer not null default 60,
  host text not null default '',
  price integer not null default 0,
  seats integer not null default 20 check (seats >= 0),
  seats_taken integer not null default 0,
  tags text[] not null default '{}',
  location text not null default 'En ligne',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_event_registrations (
  event_id text not null references public.club_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index club_event_registrations_user_idx on public.club_event_registrations (user_id);

create table public.club_labs (
  id text primary key default ('lab_' || substr(md5(gen_random_uuid()::text), 1, 10)),
  name text not null,
  theme text not null default '',
  cadence text not null default '',
  members_count integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_lab_members (
  lab_id text not null references public.club_labs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (lab_id, user_id)
);
create index club_lab_members_user_idx on public.club_lab_members (user_id);

create table public.experts (
  id text primary key default ('x_' || substr(md5(gen_random_uuid()::text), 1, 10)),
  name text not null,
  initials text not null default '',
  role text not null default '',
  skills text[] not null default '{}',
  rate integer not null default 100,
  rating double precision not null default 5,
  sessions integer not null default 0,
  available text not null default '',
  published boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expert_bookings (
  id uuid primary key default gen_random_uuid(),
  expert_id text not null references public.experts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  slot text not null,
  topic text not null default '',
  shared boolean not null default false,
  price integer not null default 0,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);
create index expert_bookings_user_idx on public.expert_bookings (user_id);

create table public.club_posts (
  id text primary key default ('post_' || substr(md5(gen_random_uuid()::text), 1, 12)),
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  author_name text not null default '',
  author_initials text not null default '',
  author_role text not null default 'Membre BuildOS',
  kind text not null default 'build' check (kind in ('build', 'question', 'win', 'feedback')),
  content text not null check (char_length(content) between 1 and 4000),
  project text,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now()
);
create index club_posts_created_idx on public.club_posts (created_at desc);

create table public.club_post_likes (
  post_id text not null references public.club_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create trigger club_events_touch before update on public.club_events for each row execute function public.touch_updated_at();
create trigger club_labs_touch before update on public.club_labs for each row execute function public.touch_updated_at();
create trigger experts_touch before update on public.experts for each row execute function public.touch_updated_at();

/* ─────────── Compteurs (maintenus côté base) ─────────── */

create or replace function public.club_event_seats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.club_events;
begin
  if tg_op = 'INSERT' then
    select * into ev from public.club_events where id = new.event_id for update;
    if ev.id is null or not ev.published then
      raise exception 'Événement introuvable.' using errcode = 'P0002';
    end if;
    if ev.seats_taken >= ev.seats then
      raise exception 'Complet : plus aucune place disponible.' using errcode = 'P0001';
    end if;
    update public.club_events set seats_taken = seats_taken + 1 where id = new.event_id;
    return new;
  end if;
  update public.club_events set seats_taken = greatest(0, seats_taken - 1) where id = old.event_id;
  return old;
end;
$$;

create trigger club_event_registrations_seats
  before insert or delete on public.club_event_registrations
  for each row execute function public.club_event_seats();

create or replace function public.club_lab_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.club_labs set members_count = members_count + 1 where id = new.lab_id;
    return new;
  end if;
  update public.club_labs set members_count = greatest(0, members_count - 1) where id = old.lab_id;
  return old;
end;
$$;

create trigger club_lab_members_count
  after insert or delete on public.club_lab_members
  for each row execute function public.club_lab_count();

create or replace function public.club_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.club_posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  end if;
  update public.club_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  return old;
end;
$$;

create trigger club_post_likes_count
  after insert or delete on public.club_post_likes
  for each row execute function public.club_post_like_count();

-- L'auteur d'un post est toujours le compte courant, son nom vient de son profil.
create or replace function public.club_post_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n text;
begin
  new.author_id := auth.uid();
  select coalesce(nullif(p.name, ''), split_part(p.email, '@', 1)) into n from public.profiles p where p.id = auth.uid();
  new.author_name := coalesce(n, 'Membre');
  new.author_initials := upper(left(regexp_replace(initcap(new.author_name), '[^A-Z]', '', 'g'), 2));
  if new.author_initials = '' then new.author_initials := upper(left(new.author_name, 1)); end if;
  new.likes_count := 0;
  new.comments_count := 0;
  new.hidden := false;
  new.hidden_reason := null;
  return new;
end;
$$;

create trigger club_posts_author before insert on public.club_posts
  for each row when (auth.uid() is not null)
  execute function public.club_post_author();

/* ─────────── RLS Build Club ─────────── */

alter table public.club_events enable row level security;
alter table public.club_event_registrations enable row level security;
alter table public.club_labs enable row level security;
alter table public.club_lab_members enable row level security;
alter table public.experts enable row level security;
alter table public.expert_bookings enable row level security;
alter table public.club_posts enable row level security;
alter table public.club_post_likes enable row level security;

-- Contenus éditoriaux : lecture des contenus publiés, écriture réservée aux admins.
create policy club_events_select on public.club_events for select to authenticated using (published or public.is_admin());
create policy club_events_admin on public.club_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy club_labs_select on public.club_labs for select to authenticated using (published or public.is_admin());
create policy club_labs_admin on public.club_labs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy experts_select on public.experts for select to authenticated using (published or public.is_admin());
create policy experts_admin on public.experts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Inscriptions / adhésions / réservations : les siennes (et tout pour les admins).
create policy registrations_select on public.club_event_registrations for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy registrations_insert on public.club_event_registrations for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());
create policy registrations_delete on public.club_event_registrations for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy lab_members_select on public.club_lab_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy lab_members_insert on public.club_lab_members for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());
create policy lab_members_delete on public.club_lab_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy bookings_select on public.expert_bookings for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy bookings_insert on public.expert_bookings for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user() and status = 'requested');
create policy bookings_admin_update on public.expert_bookings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Communauté : posts visibles sauf masqués ; l'auteur peut supprimer ; les admins modèrent.
create policy posts_select on public.club_posts for select to authenticated
  using (not hidden or author_id = (select auth.uid()) or public.is_admin());
create policy posts_insert on public.club_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_active_user());
create policy posts_admin_update on public.club_posts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy posts_delete on public.club_posts for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

create policy likes_select on public.club_post_likes for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy likes_insert on public.club_post_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());
create policy likes_delete on public.club_post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Les compteurs ne sont jamais écrits directement par les membres.
revoke all on public.club_events, public.club_event_registrations, public.club_labs, public.club_lab_members,
  public.experts, public.expert_bookings, public.club_posts, public.club_post_likes from anon;

/* ─────────── Contenus de départ (identiques au prototype) ─────────── */

insert into public.club_events (id, kind, title, description, starts_at, duration_min, host, price, seats, seats_taken, tags, location) values
  ('ev1', 'atelier', 'Écrire une spec que l''IA comprend du premier coup', 'La méthode Objectif · Contraintes · Critères. Vous repartez avec 3 specs prêtes à confier à BuildOS.', date_trunc('day', now()) + interval '2 days 18 hours', 60, 'Léa Martin', 0, 40, 31, '{Produit,Débutant}', 'En ligne'),
  ('ev2', 'office_hours', 'Office hours : débloquer votre mise en production', '30 minutes avec un expert pour passer de la préprod à la prod sans sueurs froides.', date_trunc('day', now()) + interval '3 days 12 hours', 30, 'Karim Benali', 0, 8, 5, '{Déploiement}', 'En ligne'),
  ('ev3', 'atelier', 'Automatiser son acquisition avec des agents', 'Séquences, enrichissement, relances : construire un tunnel qui tourne pendant que vous dormez.', date_trunc('day', now()) + interval '5 days 19 hours', 90, 'Inès Robert', 29, 30, 18, '{Marketing,Automatisation}', 'En ligne'),
  ('ev4', 'live', 'Build in public : 3 fondateurs livrent en direct', 'Trois membres montrent leur tableau BuildOS et livrent une fonctionnalité en 45 minutes.', date_trunc('day', now()) + interval '6 days 18 hours', 45, 'Build Club', 0, 300, 88, '{Communauté}', 'Live'),
  ('ev5', 'startupweek', 'StartupWeek — 7 jours pour lancer votre MVP', 'Le format intensif : cadrage, construction, tests, déploiement, pitch. Avec BuildOS du premier au dernier jour.', '2026-11-09T09:00:00Z', 3360, 'StartupWeek', 990, 24, 17, '{Intensif,Lyon}', 'Lyon'),
  ('ev6', 'lab', 'Lab Produit : revue croisée de vos PRD', 'Échangez vos PRD générés, recevez 3 retours concrets, repartez avec une v2.', date_trunc('day', now()) + interval '8 days 18 hours', 60, 'Lab Produit', 0, 16, 10, '{Produit,Pairs}', 'En ligne');

insert into public.club_labs (id, name, theme, cadence, members_count) values
  ('lab-build', 'Lab Build', 'Construire et livrer avec des agents de code', 'Chaque mardi', 184),
  ('lab-produit', 'Lab Produit', 'Specs, priorisation, tests utilisateurs', 'Un jeudi sur deux', 142),
  ('lab-growth', 'Lab Growth', 'Acquisition, contenus, automatisations', 'Chaque lundi', 203),
  ('lab-automation', 'Lab Automatisation', 'n8n, Make, agents métiers', 'Chaque mercredi', 167),
  ('lab-decouverte', 'Lab Découverte IA', 'Premiers pas, bonnes pratiques, outils', 'Chaque vendredi', 311);

insert into public.experts (id, name, initials, role, skills, rate, rating, sessions, available, sort) values
  ('x1', 'Karim Benali', 'KB', 'CTO freelance · ex-scale-up', '{Architecture,Supabase,Déploiement}', 120, 4.9, 86, 'Demain 12:00', 1),
  ('x2', 'Léa Martin', 'LM', 'Product manager', '{PRD,Priorisation,"Tests utilisateurs"}', 110, 4.8, 64, 'Aujourd''hui 17:30', 2),
  ('x3', 'Inès Robert', 'IR', 'Growth marketer', '{Acquisition,SEO,Automatisation}', 115, 4.9, 71, 'Jeudi 10:00', 3),
  ('x4', 'Thomas Nguyen', 'TN', 'Designer produit', '{UX,"Design system",Maquettes}', 130, 5.0, 39, 'Vendredi 14:00', 4),
  ('x5', 'Claire Dubois', 'CD', 'Avocate numérique', '{RGPD,"CGU / CGV","Levée de fonds"}', 140, 4.8, 52, 'Lundi 9:00', 5);

insert into public.club_posts (id, author_id, author_name, author_initials, author_role, kind, content, project, likes_count, comments_count, created_at) values
  ('p1', null, 'Sofiane A.', 'SA', 'Fondateur · Tablo', 'win', 'Premier client payant ce matin 🎉 La page de paiement a été générée, revue et mise en prod en une après-midi sur BuildOS. Merci au Lab Build pour la relecture du flux Stripe.', 'Tablo — réservation pour restaurants', 48, 12, now() - interval '2 hours'),
  ('p2', null, 'Julie P.', 'JP', 'Freelance · RH', 'question', 'Vous routez vos tâches d''API vers quel agent ? Codex va vite mais je me retrouve à demander des retouches sur la gestion d''erreurs.', null, 9, 17, now() - interval '7 hours'),
  ('p3', null, 'Marc D.', 'MD', 'Co-fondateur · Vetly', 'build', 'Semaine 2 : tableau de bord vétérinaire en préprod. L''audit a remonté 3 problèmes d''accessibilité, tous transformés en tâches et corrigés par l''IA dans la foulée.', 'Vetly — suivi des animaux', 31, 6, now() - interval '1 day'),
  ('p4', null, 'Amandine L.', 'AL', 'Intrapreneuse · Groupe hôtelier', 'feedback', 'Qui veut tester mon portail client en avant-première ? 10 minutes, je vous rends la pareille sur votre produit.', 'Portail séminaires', 22, 14, now() - interval '38 hours');

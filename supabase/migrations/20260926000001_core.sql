-- BuildOS — socle : profils, projets, équipes, tâches, journal, artefacts.
-- Règle générale : RLS partout ; les fonctions d'aide sont SECURITY DEFINER avec search_path vide.

create extension if not exists pgcrypto with schema extensions;

/* ═══════════════════════════ Types ═══════════════════════════ */

create type public.app_role as enum ('founder', 'admin');
create type public.member_role as enum ('owner', 'member', 'viewer');

/* ═══════════════════════════ Profils ═══════════════════════════ */

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  name text not null default '',
  app_role public.app_role not null default 'founder',
  founder_role text not null default 'solo',
  tech_level text not null default 'some',
  project_stage text not null default 'idea',
  goal text not null default '',
  hours_per_week integer not null default 10,
  onboarded boolean not null default false,
  joined_club boolean not null default false,
  plan text not null default 'builder',
  ai_quota_usd numeric(10, 2) not null default 25,
  suspended_at timestamptz,
  suspended_reason text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil fondateur (1 par compte). app_role, plan, quota et suspension ne sont modifiables que par les admins (RPC).';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Synchronise l'e-mail quand l'utilisateur le change
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

/* ═══════════════════════════ Projets & équipes ═══════════════════════════ */

create table public.projects (
  id text primary key,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null default '',
  description text,
  emoji text not null default '🛠️',
  kind text not null default 'mixed',
  workspace_path text not null default '',
  repo_path text,
  base_branch text not null default 'main',
  autonomy text not null default 'autopilot',
  integrations jsonb not null default '{}'::jsonb,
  ai_model text,
  ai_effort text,
  context text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_idx on public.projects (owner_id);

create table public.project_members (
  project_id text not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);

create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects (id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role public.member_role not null default 'member' check (role <> 'owner'),
  invited_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index project_invitations_pending_uq on public.project_invitations (project_id, email) where accepted_at is null;
create index project_invitations_email_idx on public.project_invitations (email) where accepted_at is null;

/* ─────────── Fonctions d'aide (utilisées par les politiques RLS) ─────────── */

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.suspended_at is null
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.app_role = 'admin' and p.suspended_at is null
  );
$$;

create or replace function public.project_role(pid text)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.project_members m
  join public.profiles p on p.id = m.user_id
  where m.project_id = pid and m.user_id = (select auth.uid()) and p.suspended_at is null;
$$;

create or replace function public.is_project_member(pid text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.project_role(pid) is not null;
$$;

create or replace function public.can_edit_project(pid text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.project_role(pid) in ('owner', 'member'), false);
$$;

create or replace function public.is_project_owner(pid text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.project_role(pid) = 'owner', false);
$$;

create or replace function public.shares_project_with(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members a
    join public.project_members b on b.project_id = a.project_id
    where a.user_id = (select auth.uid()) and b.user_id = uid
  );
$$;

revoke execute on function public.is_active_user(), public.is_admin(), public.project_role(text), public.is_project_member(text),
  public.can_edit_project(text), public.is_project_owner(text), public.shares_project_with(uuid) from public, anon;
grant execute on function public.is_active_user(), public.is_admin(), public.project_role(text), public.is_project_member(text),
  public.can_edit_project(text), public.is_project_owner(text), public.shares_project_with(uuid) to authenticated;

/* ─────────── Déclencheurs projets ─────────── */

-- Le propriétaire devient membre « owner » à la création du projet
create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

create trigger on_project_created after insert on public.projects
  for each row execute function public.handle_new_project();

-- Le propriétaire ne change jamais par une simple mise à jour
create or replace function public.protect_project_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger projects_protect_owner before update on public.projects
  for each row execute function public.protect_project_owner();

/* ─────────── Invitations ─────────── */

-- Accepter une invitation : l'e-mail du compte (confirmé) doit correspondre.
create or replace function public.accept_invitation(invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.project_invitations;
  user_email text;
begin
  if not public.is_active_user() then
    raise exception 'Compte inactif.' using errcode = '42501';
  end if;
  select lower(u.email) into user_email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  if user_email is null then
    raise exception 'Confirmez votre adresse e-mail avant d''accepter une invitation.' using errcode = '42501';
  end if;
  select * into inv from public.project_invitations i where i.id = invitation_id and i.accepted_at is null;
  if inv.id is null or inv.email <> user_email then
    raise exception 'Invitation introuvable ou déjà utilisée.' using errcode = 'P0002';
  end if;
  insert into public.project_members (project_id, user_id, role, invited_by)
  values (inv.project_id, auth.uid(), inv.role, inv.invited_by)
  on conflict (project_id, user_id) do nothing;
  update public.project_invitations set accepted_at = now() where id = inv.id;
  return inv.project_id;
end;
$$;

revoke execute on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

-- Invitations en attente pour le compte courant, avec le nom du projet (non visible avant d'être membre).
create or replace function public.my_invitations()
returns table (id uuid, project_id text, project_name text, project_emoji text, role public.member_role, invited_by_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.project_id, p.name, p.emoji, i.role, coalesce(nullif(inv.name, ''), inv.email), i.created_at
  from public.project_invitations i
  join public.projects p on p.id = i.project_id
  left join public.profiles inv on inv.id = i.invited_by
  where i.accepted_at is null
    and i.email = lower((select auth.jwt() ->> 'email'))
  order by i.created_at desc;
$$;

revoke execute on function public.my_invitations() from public, anon;
grant execute on function public.my_invitations() to authenticated;

/* ═══════════════════════════ Tâches, journal, artefacts ═══════════════════════════ */

create table public.tasks (
  id text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  title text not null,
  spec text not null default '',
  type text not null default 'other',
  priority text not null default 'medium',
  stage text not null default 'backlog',
  status text not null default 'idle',
  position double precision not null default 0,
  autonomy text,
  iteration integer not null default 0,
  refined_spec jsonb,
  plan jsonb,
  answers jsonb not null default '[]'::jsonb,
  build_result jsonb,
  verify_result jsonb,
  review jsonb,
  integration jsonb,
  feedback jsonb not null default '[]'::jsonb,
  error text,
  branch text,
  workspace_path text,
  session_id text,
  cost_usd double precision not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  ai_duration_ms bigint not null default 0,
  due_date text,
  labels jsonb not null default '[]'::jsonb,
  timings jsonb not null default '{}'::jsonb,
  last_activity text,
  started_at timestamptz,
  completed_at timestamptz,
  -- Bail d'exécution : quel client (onglet) fait avancer la tâche, et depuis quand
  sim_owner text,
  sim_heartbeat timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_status_idx on public.tasks (status);
create index tasks_created_by_idx on public.tasks (created_by);

create table public.task_events (
  id bigint primary key,
  task_id text not null references public.tasks (id) on delete cascade,
  project_id text not null references public.projects (id) on delete cascade,
  ts timestamptz not null default now(),
  stage text,
  kind text not null,
  message text not null default '',
  data jsonb
);
create index task_events_task_idx on public.task_events (task_id, id);
create index task_events_project_idx on public.task_events (project_id);

create table public.artifacts (
  id text primary key,
  task_id text not null references public.tasks (id) on delete cascade,
  project_id text not null references public.projects (id) on delete cascade,
  kind text not null,
  title text not null,
  path text,
  url text,
  mime text,
  size bigint,
  content text,
  created_at timestamptz not null default now()
);
create index artifacts_task_idx on public.artifacts (task_id);
create index artifacts_project_idx on public.artifacts (project_id);

-- Prise de bail atomique : réussit si le bail est libre, déjà à nous, ou périmé.
create or replace function public.claim_task_lease(task_id text, owner text, stale_seconds integer default 25)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n integer;
begin
  update public.tasks t
     set sim_owner = owner, sim_heartbeat = now()
   where t.id = task_id
     and (t.sim_owner is null or t.sim_owner = owner or t.sim_heartbeat is null
          or t.sim_heartbeat < now() - make_interval(secs => stale_seconds));
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Battement de cœur des baux détenus par un client.
create or replace function public.renew_task_leases(task_ids text[], owner text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n integer;
begin
  update public.tasks t set sim_heartbeat = now()
   where t.id = any (task_ids) and t.sim_owner = owner;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.claim_task_lease(text, text, integer), public.renew_task_leases(text[], text) from public, anon;
grant execute on function public.claim_task_lease(text, text, integer), public.renew_task_leases(text[], text) to authenticated;

/* ═══════════════════════════ Préférences utilisateur ═══════════════════════════ */

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade default auth.uid(),
  settings jsonb not null default '{}'::jsonb,
  agents jsonb,
  routing jsonb,
  strategy text,
  updated_at timestamptz not null default now()
);

create trigger user_preferences_touch before update on public.user_preferences
  for each row execute function public.touch_updated_at();

/* ═══════════════════════════ RLS ═══════════════════════════ */

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;
alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.artifacts enable row level security;
alter table public.user_preferences enable row level security;

-- Profils : soi-même, ses coéquipiers, les admins. Mise à jour limitée par colonnes (voir GRANT).
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin() or public.shares_project_with(id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name, founder_role, tech_level, project_stage, goal, hours_per_week, onboarded, joined_club, last_seen_at)
  on public.profiles to authenticated;

-- Projets
create policy projects_select on public.projects for select to authenticated
  using (public.is_project_member(id) or public.is_admin());
create policy projects_insert on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_active_user());
create policy projects_update on public.projects for update to authenticated
  using (public.can_edit_project(id) or public.is_admin())
  with check (public.can_edit_project(id) or public.is_admin());
create policy projects_delete on public.projects for delete to authenticated
  using (public.is_project_owner(id) or public.is_admin());

-- Membres : visibles par l'équipe ; le propriétaire gère les rôles ; chacun peut partir (sauf le propriétaire).
create policy members_select on public.project_members for select to authenticated
  using (public.is_project_member(project_id) or public.is_admin());
create policy members_update on public.project_members for update to authenticated
  using (public.is_project_owner(project_id) and role <> 'owner')
  with check (public.is_project_owner(project_id) and role <> 'owner');
create policy members_delete on public.project_members for delete to authenticated
  using (
    (public.is_project_owner(project_id) and role <> 'owner')
    or (user_id = (select auth.uid()) and role <> 'owner')
  );

-- Invitations : gérées par le propriétaire, visibles par l'invité (même e-mail).
create policy invitations_select on public.project_invitations for select to authenticated
  using (
    public.is_project_owner(project_id)
    or email = lower((select auth.jwt() ->> 'email'))
    or public.is_admin()
  );
create policy invitations_insert on public.project_invitations for insert to authenticated
  with check (public.is_project_owner(project_id) and invited_by = (select auth.uid()));
create policy invitations_delete on public.project_invitations for delete to authenticated
  using (public.is_project_owner(project_id) or email = lower((select auth.jwt() ->> 'email')));

-- Tâches
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_project_member(project_id) or public.is_admin());
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.can_edit_project(project_id));
create policy tasks_update on public.tasks for update to authenticated
  using (public.can_edit_project(project_id) or public.is_admin())
  with check (public.can_edit_project(project_id) or public.is_admin());
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.can_edit_project(project_id) or public.is_admin());

-- Journal
create policy events_select on public.task_events for select to authenticated
  using (public.is_project_member(project_id) or public.is_admin());
create policy events_insert on public.task_events for insert to authenticated
  with check (
    public.can_edit_project(project_id)
    and exists (select 1 from public.tasks t where t.id = task_id and t.project_id = task_events.project_id)
  );
create policy events_delete on public.task_events for delete to authenticated
  using (public.can_edit_project(project_id));

-- Artefacts
create policy artifacts_select on public.artifacts for select to authenticated
  using (public.is_project_member(project_id) or public.is_admin());
create policy artifacts_insert on public.artifacts for insert to authenticated
  with check (
    public.can_edit_project(project_id)
    and exists (select 1 from public.tasks t where t.id = task_id and t.project_id = artifacts.project_id)
  );
create policy artifacts_update on public.artifacts for update to authenticated
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy artifacts_delete on public.artifacts for delete to authenticated
  using (public.can_edit_project(project_id));

-- Préférences : strictement personnelles
create policy prefs_select on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy prefs_insert on public.user_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy prefs_update on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Aucun accès anonyme aux données
revoke all on public.projects, public.project_members, public.project_invitations, public.tasks,
  public.task_events, public.artifacts, public.user_preferences from anon;

/* ═══════════════════════════ Temps réel ═══════════════════════════ */

alter publication supabase_realtime add table public.projects, public.project_members, public.tasks, public.task_events;

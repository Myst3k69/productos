-- BuildOS — administration : journal des actions, fonctions RPC réservées aux admins.
-- Toutes les fonctions vérifient public.is_admin() et lèvent 42501 sinon.

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
create policy admin_audit_log_select on public.admin_audit_log for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.admin_audit_log from anon, authenticated;

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.log_admin_action(action text, target_type text, target_id text, details jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), action, target_type, target_id, coalesce(details, '{}'::jsonb));
$$;

/* ─────────── Vue d'ensemble ─────────── */

create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_new_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'users_active_7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'users_suspended', (select count(*) from public.profiles where suspended_at is not null),
    'admins', (select count(*) from public.profiles where app_role = 'admin'),
    'projects_total', (select count(*) from public.projects where not archived),
    'projects_shared', (select count(*) from (select project_id from public.project_members group by project_id having count(*) > 1) s),
    'tasks_total', (select count(*) from public.tasks),
    'tasks_running', (select count(*) from public.tasks where status in ('running', 'queued')),
    'tasks_waiting', (select count(*) from public.tasks where status in ('waiting_input', 'waiting_review')),
    'tasks_failed', (select count(*) from public.tasks where status = 'failed'),
    'tasks_done_7d', (select count(*) from public.tasks where status = 'done' and completed_at >= now() - interval '7 days'),
    'cost_month', (select coalesce(sum(cost_usd), 0) from public.ai_usage where created_at >= date_trunc('month', now())),
    'cost_total', (select coalesce(sum(cost_usd), 0) from public.tasks),
    'users_over_quota', (
      select count(*) from public.profiles p
      where p.ai_quota_usd > 0 and (select coalesce(sum(u.cost_usd), 0) from public.ai_usage u
        where u.user_id = p.id and u.created_at >= date_trunc('month', now())) >= p.ai_quota_usd
    ),
    'club_events_upcoming', (select count(*) from public.club_events where published and starts_at >= now()),
    'club_registrations', (select count(*) from public.club_event_registrations),
    'club_posts_7d', (select count(*) from public.club_posts where created_at >= now() - interval '7 days'),
    'club_posts_hidden', (select count(*) from public.club_posts where hidden),
    'bookings_requested', (select count(*) from public.expert_bookings where status = 'requested')
  ) into result;
  return result;
end;
$$;

/* ─────────── Utilisateurs ─────────── */

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  name text,
  app_role public.app_role,
  plan text,
  ai_quota_usd numeric,
  suspended_at timestamptz,
  suspended_reason text,
  onboarded boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  projects_owned bigint,
  projects_member bigint,
  tasks_created bigint,
  cost_month double precision,
  cost_total double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select p.id, p.email, p.name, p.app_role, p.plan, p.ai_quota_usd, p.suspended_at, p.suspended_reason, p.onboarded, p.created_at,
         u.last_sign_in_at, u.email_confirmed_at,
         (select count(*) from public.projects pr where pr.owner_id = p.id),
         (select count(*) from public.project_members m where m.user_id = p.id and m.role <> 'owner'),
         (select count(*) from public.tasks t where t.created_by = p.id),
         (select coalesce(sum(a.cost_usd), 0) from public.ai_usage a where a.user_id = p.id and a.created_at >= date_trunc('month', now())),
         (select coalesce(sum(a.cost_usd), 0) from public.ai_usage a where a.user_id = p.id)
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_set_role(target uuid, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_role public.app_role;
begin
  perform public.assert_admin();
  select app_role into old_role from public.profiles where id = target;
  if old_role is null then
    raise exception 'Utilisateur introuvable.' using errcode = 'P0002';
  end if;
  if old_role = new_role then return; end if;
  if old_role = 'admin' and (select count(*) from public.profiles where app_role = 'admin' and suspended_at is null) <= 1 then
    raise exception 'Impossible de retirer le dernier administrateur.' using errcode = 'P0001';
  end if;
  update public.profiles set app_role = new_role where id = target;
  perform public.log_admin_action('user.role', 'user', target::text, jsonb_build_object('from', old_role, 'to', new_role));
end;
$$;

create or replace function public.admin_set_suspended(target uuid, suspend boolean, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if target = auth.uid() then
    raise exception 'Vous ne pouvez pas suspendre votre propre compte.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'Utilisateur introuvable.' using errcode = 'P0002';
  end if;
  update public.profiles
     set suspended_at = case when suspend then coalesce(suspended_at, now()) else null end,
         suspended_reason = case when suspend then nullif(trim(reason), '') else null end
   where id = target;
  perform public.log_admin_action(case when suspend then 'user.suspend' else 'user.reactivate' end, 'user', target::text,
    jsonb_build_object('reason', reason));
end;
$$;

create or replace function public.admin_set_quota(target uuid, quota numeric, new_plan text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before record;
begin
  perform public.assert_admin();
  if quota < 0 or quota > 100000 then
    raise exception 'Quota invalide.' using errcode = '22023';
  end if;
  select ai_quota_usd, plan into before from public.profiles where id = target;
  if not found then
    raise exception 'Utilisateur introuvable.' using errcode = 'P0002';
  end if;
  update public.profiles set ai_quota_usd = quota, plan = coalesce(nullif(trim(new_plan), ''), plan) where id = target;
  perform public.log_admin_action('user.quota', 'user', target::text,
    jsonb_build_object('quota_from', before.ai_quota_usd, 'quota_to', quota, 'plan_from', before.plan, 'plan_to', coalesce(nullif(trim(new_plan), ''), before.plan)));
end;
$$;

/* ─────────── Projets & IA ─────────── */

create or replace function public.admin_list_projects()
returns table (
  id text,
  name text,
  emoji text,
  archived boolean,
  owner_id uuid,
  owner_name text,
  owner_email text,
  members bigint,
  tasks_total bigint,
  tasks_running bigint,
  tasks_waiting bigint,
  tasks_failed bigint,
  tasks_done bigint,
  cost_total double precision,
  last_activity timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select pr.id, pr.name, pr.emoji, pr.archived, pr.owner_id, o.name, o.email,
         (select count(*) from public.project_members m where m.project_id = pr.id),
         count(t.id),
         count(t.id) filter (where t.status in ('running', 'queued')),
         count(t.id) filter (where t.status in ('waiting_input', 'waiting_review')),
         count(t.id) filter (where t.status = 'failed'),
         count(t.id) filter (where t.status = 'done'),
         coalesce(sum(t.cost_usd), 0),
         greatest(pr.updated_at, max(t.updated_at)),
         pr.created_at
  from public.projects pr
  left join public.profiles o on o.id = pr.owner_id
  left join public.tasks t on t.project_id = pr.id
  group by pr.id, o.name, o.email
  order by greatest(pr.updated_at, max(t.updated_at)) desc nulls last;
end;
$$;

create or replace function public.admin_cost_by_day(days integer default 30)
returns table (day date, cost_usd double precision, tokens bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select d::date, coalesce(sum(u.cost_usd), 0), coalesce(sum(u.tokens), 0)::bigint
  from generate_series(current_date - (greatest(1, least(days, 365)) - 1), current_date, interval '1 day') d
  left join public.ai_usage u on u.created_at >= d and u.created_at < d + interval '1 day'
  group by d
  order by d;
end;
$$;

-- Annule une tâche (supervision) : statut, événement de journal, bail libéré.
create or replace function public.admin_cancel_task(task_id text, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tasks;
  msg text;
begin
  perform public.assert_admin();
  select * into t from public.tasks where id = task_id;
  if t.id is null then
    raise exception 'Tâche introuvable.' using errcode = 'P0002';
  end if;
  msg := 'Annulée par l''équipe BuildOS' || coalesce(' : ' || nullif(trim(reason), ''), '');
  update public.tasks
     set status = 'cancelled', last_activity = 'Annulée par l''équipe BuildOS', sim_owner = null, sim_heartbeat = null, updated_at = now()
   where id = task_id;
  insert into public.task_events (id, task_id, project_id, ts, stage, kind, message, data)
  values ((floor(extract(epoch from clock_timestamp()) * 1000) * 1000 + floor(random() * 1000))::bigint,
          t.id, t.project_id, now(), t.stage, 'system', msg, jsonb_build_object('by', 'admin'));
  perform public.log_admin_action('task.cancel', 'task', task_id, jsonb_build_object('project_id', t.project_id, 'title', t.title, 'reason', reason));
end;
$$;

/* ─────────── Modération Build Club ─────────── */

create or replace function public.admin_moderate_post(post_id text, hide boolean, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.club_posts
     set hidden = hide, hidden_reason = case when hide then nullif(trim(reason), '') else null end
   where id = post_id;
  if not found then
    raise exception 'Publication introuvable.' using errcode = 'P0002';
  end if;
  perform public.log_admin_action(case when hide then 'post.hide' else 'post.show' end, 'post', post_id, jsonb_build_object('reason', reason));
end;
$$;

-- Journalise les modifications de contenus éditoriaux faites par un admin.
create or replace function public.log_club_content_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid text;
  label text;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  rid := coalesce(new.id, old.id);
  label := coalesce(to_jsonb(coalesce(new, old)) ->> 'title', to_jsonb(coalesce(new, old)) ->> 'name');
  perform public.log_admin_action(tg_table_name || '.' || lower(tg_op), tg_table_name, rid, jsonb_build_object('label', label));
  return coalesce(new, old);
end;
$$;

create trigger club_events_log after insert or update or delete on public.club_events
  for each row execute function public.log_club_content_change();
create trigger club_labs_log after insert or update or delete on public.club_labs
  for each row execute function public.log_club_content_change();
create trigger experts_log after insert or update or delete on public.experts
  for each row execute function public.log_club_content_change();

-- Liste des inscrits d'un événement (nom, e-mail)
create or replace function public.admin_event_registrations(event_id text)
returns table (user_id uuid, name text, email text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select r.user_id, p.name, p.email, r.created_at
  from public.club_event_registrations r
  join public.profiles p on p.id = r.user_id
  where r.event_id = admin_event_registrations.event_id
  order by r.created_at;
end;
$$;

-- Réservations d'experts avec le nom du demandeur
create or replace function public.admin_list_bookings()
returns table (id uuid, expert_id text, expert_name text, user_id uuid, user_name text, user_email text,
               slot text, topic text, shared boolean, price integer, status text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select b.id, b.expert_id, e.name, b.user_id, p.name, p.email, b.slot, b.topic, b.shared, b.price, b.status, b.created_at
  from public.expert_bookings b
  join public.experts e on e.id = b.expert_id
  join public.profiles p on p.id = b.user_id
  order by b.created_at desc;
end;
$$;

/* ─────────── Droits d'exécution ─────────── */

revoke execute on function public.assert_admin(), public.log_admin_action(text, text, text, jsonb),
  public.admin_overview(), public.admin_list_users(), public.admin_set_role(uuid, public.app_role),
  public.admin_set_suspended(uuid, boolean, text), public.admin_set_quota(uuid, numeric, text),
  public.admin_list_projects(), public.admin_cost_by_day(integer), public.admin_cancel_task(text, text),
  public.admin_moderate_post(text, boolean, text), public.admin_event_registrations(text), public.admin_list_bookings()
  from public, anon;

-- log_admin_action n'est jamais appelable directement
revoke execute on function public.log_admin_action(text, text, text, jsonb) from authenticated;

grant execute on function public.assert_admin(), public.admin_overview(), public.admin_list_users(),
  public.admin_set_role(uuid, public.app_role), public.admin_set_suspended(uuid, boolean, text),
  public.admin_set_quota(uuid, numeric, text), public.admin_list_projects(), public.admin_cost_by_day(integer),
  public.admin_cancel_task(text, text), public.admin_moderate_post(text, boolean, text),
  public.admin_event_registrations(text), public.admin_list_bookings()
  to authenticated;

-- Fonctions de déclencheur : jamais exposées en RPC
revoke execute on function public.handle_new_user(), public.handle_user_email_change(), public.handle_new_project(),
  public.record_ai_usage(), public.club_event_seats(), public.club_lab_count(), public.club_post_like_count(),
  public.club_post_author(), public.log_club_content_change() from public, anon, authenticated;

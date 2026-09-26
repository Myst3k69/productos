-- BuildOS — durcissement après revue des conseillers Supabase :
--  1. les fonctions d'aide des politiques RLS passent dans un schéma `private` (non exposé par l'API) ;
--  2. les politiques n'évaluent plus auth.jwt() à chaque ligne ;
--  3. index sur les clés étrangères ; une seule politique SELECT par table éditoriale.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

/* ─────────── 1. Fonctions d'aide → private ─────────── */

alter function public.is_active_user() set schema private;
alter function public.is_admin() set schema private;
alter function public.project_role(text) set schema private;
alter function public.is_project_member(text) set schema private;
alter function public.can_edit_project(text) set schema private;
alter function public.is_project_owner(text) set schema private;
alter function public.shares_project_with(uuid) set schema private;
alter function public.assert_admin() set schema private;
alter function public.log_admin_action(text, text, text, jsonb) set schema private;

-- Corps réécrits pour référencer le nouveau schéma
create or replace function private.is_project_member(pid text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.project_role(pid) is not null;
$$;

create or replace function private.can_edit_project(pid text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.project_role(pid) in ('owner', 'member'), false);
$$;

create or replace function private.is_project_owner(pid text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.project_role(pid) = 'owner', false);
$$;

create or replace function private.assert_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.current_email()
returns text language sql stable set search_path = '' as $$
  select lower(auth.jwt() ->> 'email');
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.is_active_user(), private.is_admin(), private.project_role(text), private.is_project_member(text),
  private.can_edit_project(text), private.is_project_owner(text), private.shares_project_with(uuid), private.current_email()
  to authenticated;
revoke execute on function private.assert_admin(), private.log_admin_action(text, text, text, jsonb) from authenticated;

-- Fonctions publiques qui appelaient les fonctions déplacées
create or replace function public.accept_invitation(invitation_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  inv public.project_invitations;
  user_email text;
begin
  if not private.is_active_user() then
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

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  perform private.assert_admin();
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

create or replace function public.admin_list_users()
returns table (
  id uuid, email text, name text, app_role public.app_role, plan text, ai_quota_usd numeric,
  suspended_at timestamptz, suspended_reason text, onboarded boolean, created_at timestamptz,
  last_sign_in_at timestamptz, email_confirmed_at timestamptz, projects_owned bigint, projects_member bigint,
  tasks_created bigint, cost_month double precision, cost_total double precision
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
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
returns void language plpgsql security definer set search_path = '' as $$
declare
  old_role public.app_role;
begin
  perform private.assert_admin();
  select app_role into old_role from public.profiles where id = target;
  if old_role is null then
    raise exception 'Utilisateur introuvable.' using errcode = 'P0002';
  end if;
  if old_role = new_role then return; end if;
  if old_role = 'admin' and (select count(*) from public.profiles where app_role = 'admin' and suspended_at is null) <= 1 then
    raise exception 'Impossible de retirer le dernier administrateur.' using errcode = 'P0001';
  end if;
  update public.profiles set app_role = new_role where id = target;
  perform private.log_admin_action('user.role', 'user', target::text, jsonb_build_object('from', old_role, 'to', new_role));
end;
$$;

create or replace function public.admin_set_suspended(target uuid, suspend boolean, reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
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
  perform private.log_admin_action(case when suspend then 'user.suspend' else 'user.reactivate' end, 'user', target::text,
    jsonb_build_object('reason', reason));
end;
$$;

create or replace function public.admin_set_quota(target uuid, quota numeric, new_plan text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  before record;
begin
  perform private.assert_admin();
  if quota < 0 or quota > 100000 then
    raise exception 'Quota invalide.' using errcode = '22023';
  end if;
  select ai_quota_usd, plan into before from public.profiles where id = target;
  if not found then
    raise exception 'Utilisateur introuvable.' using errcode = 'P0002';
  end if;
  update public.profiles set ai_quota_usd = quota, plan = coalesce(nullif(trim(new_plan), ''), plan) where id = target;
  perform private.log_admin_action('user.quota', 'user', target::text,
    jsonb_build_object('quota_from', before.ai_quota_usd, 'quota_to', quota, 'plan_from', before.plan, 'plan_to', coalesce(nullif(trim(new_plan), ''), before.plan)));
end;
$$;

create or replace function public.admin_list_projects()
returns table (
  id text, name text, emoji text, archived boolean, owner_id uuid, owner_name text, owner_email text,
  members bigint, tasks_total bigint, tasks_running bigint, tasks_waiting bigint, tasks_failed bigint, tasks_done bigint,
  cost_total double precision, last_activity timestamptz, created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
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
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query
  select d::date, coalesce(sum(u.cost_usd), 0), coalesce(sum(u.tokens), 0)::bigint
  from generate_series(current_date - (greatest(1, least(days, 365)) - 1), current_date, interval '1 day') d
  left join public.ai_usage u on u.created_at >= d and u.created_at < d + interval '1 day'
  group by d
  order by d;
end;
$$;

create or replace function public.admin_cancel_task(task_id text, reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.tasks;
  msg text;
begin
  perform private.assert_admin();
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
  perform private.log_admin_action('task.cancel', 'task', task_id, jsonb_build_object('project_id', t.project_id, 'title', t.title, 'reason', reason));
end;
$$;

create or replace function public.admin_moderate_post(post_id text, hide boolean, reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.club_posts
     set hidden = hide, hidden_reason = case when hide then nullif(trim(reason), '') else null end
   where id = post_id;
  if not found then
    raise exception 'Publication introuvable.' using errcode = 'P0002';
  end if;
  perform private.log_admin_action(case when hide then 'post.hide' else 'post.show' end, 'post', post_id, jsonb_build_object('reason', reason));
end;
$$;

create or replace function public.log_club_content_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rid text;
  label text;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  rid := coalesce(new.id, old.id);
  label := coalesce(to_jsonb(coalesce(new, old)) ->> 'title', to_jsonb(coalesce(new, old)) ->> 'name');
  perform private.log_admin_action(tg_table_name || '.' || lower(tg_op), tg_table_name, rid, jsonb_build_object('label', label));
  return coalesce(new, old);
end;
$$;

create or replace function public.admin_event_registrations(event_id text)
returns table (user_id uuid, name text, email text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query
  select r.user_id, p.name, p.email, r.created_at
  from public.club_event_registrations r
  join public.profiles p on p.id = r.user_id
  where r.event_id = admin_event_registrations.event_id
  order by r.created_at;
end;
$$;

create or replace function public.admin_list_bookings()
returns table (id uuid, expert_id text, expert_name text, user_id uuid, user_name text, user_email text,
               slot text, topic text, shared boolean, price integer, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query
  select b.id, b.expert_id, e.name, b.user_id, p.name, p.email, b.slot, b.topic, b.shared, b.price, b.status, b.created_at
  from public.expert_bookings b
  join public.experts e on e.id = b.expert_id
  join public.profiles p on p.id = b.user_id
  order by b.created_at desc;
end;
$$;

-- Réservation d'expert : l'admin confirme ou annule
create or replace function public.admin_set_booking_status(booking_id uuid, new_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  if new_status not in ('requested', 'confirmed', 'cancelled') then
    raise exception 'Statut invalide.' using errcode = '22023';
  end if;
  update public.expert_bookings set status = new_status where id = booking_id;
  if not found then
    raise exception 'Réservation introuvable.' using errcode = 'P0002';
  end if;
  perform private.log_admin_action('booking.' || new_status, 'booking', booking_id::text, '{}'::jsonb);
end;
$$;

revoke execute on function public.admin_set_booking_status(uuid, text) from public, anon;
grant execute on function public.admin_set_booking_status(uuid, text) to authenticated;
revoke execute on function public.log_club_content_change() from public, anon, authenticated;

/* ─────────── 2. auth.jwt() évalué une seule fois ─────────── */

drop policy invitations_select on public.project_invitations;
drop policy invitations_delete on public.project_invitations;
create policy invitations_select on public.project_invitations for select to authenticated
  using (private.is_project_owner(project_id) or email = (select private.current_email()) or private.is_admin());
create policy invitations_delete on public.project_invitations for delete to authenticated
  using (private.is_project_owner(project_id) or email = (select private.current_email()));

create or replace function public.my_invitations()
returns table (id uuid, project_id text, project_name text, project_emoji text, role public.member_role, invited_by_name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.project_id, p.name, p.emoji, i.role, coalesce(nullif(inv.name, ''), inv.email), i.created_at
  from public.project_invitations i
  join public.projects p on p.id = i.project_id
  left join public.profiles inv on inv.id = i.invited_by
  where i.accepted_at is null and i.email = private.current_email()
  order by i.created_at desc;
$$;

/* ─────────── 3. Index et politiques éditoriales ─────────── */

create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_id);
create index if not exists ai_usage_project_idx on public.ai_usage (project_id);
create index if not exists ai_usage_task_idx on public.ai_usage (task_id);
create index if not exists club_post_likes_user_idx on public.club_post_likes (user_id);
create index if not exists club_posts_author_idx on public.club_posts (author_id);
create index if not exists expert_bookings_expert_idx on public.expert_bookings (expert_id);
create index if not exists project_invitations_invited_by_idx on public.project_invitations (invited_by);
create index if not exists project_members_invited_by_idx on public.project_members (invited_by);

do $$
declare
  t text;
begin
  foreach t in array array['club_events', 'club_labs', 'experts'] loop
    execute format('drop policy %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_admin())', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_admin()) with check (private.is_admin())', t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_admin())', t || '_admin_delete', t);
  end loop;
end;
$$;

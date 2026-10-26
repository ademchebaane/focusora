-- Focusora database setup
-- Run once in Supabase Dashboard -> SQL Editor -> New query.
-- IMPORTANT: Never put your Supabase service_role key in the app. Use the publishable/anon key.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default 'Student',
  avatar_color text not null default 'purple' check (avatar_color in ('purple','coral','green','gold')),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_pair_unique unique (requester_id, addressee_id)
);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 50),
  description text not null default '',
  icon text not null default '✦',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_goals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  title text not null,
  target_minutes integer not null check (target_minutes > 0 and target_minutes <= 300000),
  deadline date,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.personal_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 70),
  target_minutes integer not null check (target_minutes > 0 and target_minutes <= 300000),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  done boolean not null default false,
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.study_groups(id) on delete set null,
  personal_goal_id uuid references public.personal_goals(id) on delete set null,
  subject text not null default 'Other',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer not null default 0 check (duration_minutes >= 0 and duration_minutes <= 1440),
  is_paused boolean not null default false,
  created_at timestamptz not null default now(),
  constraint session_end_after_start check (ended_at is null or ended_at >= started_at)
);

create index if not exists study_sessions_group_started_idx on public.study_sessions (group_id, started_at desc);
create index if not exists study_sessions_user_started_idx on public.study_sessions (user_id, started_at desc);
create index if not exists group_members_user_idx on public.group_members (user_id, group_id);
create index if not exists group_goals_group_created_idx on public.group_goals (group_id, created_at desc);
create index if not exists friendships_addressee_status_idx on public.friendships (addressee_id, status);

-- Automatically create each user's public profile when they sign up.
create or replace function public.handle_new_focusora_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_username text;
  chosen_display text;
begin
  chosen_username := coalesce(nullif(lower(new.raw_user_meta_data ->> 'username'), ''), 'student_' || substr(new.id::text, 1, 8));
  chosen_display := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), chosen_username);
  begin
    insert into public.profiles (id, username, display_name, avatar_color)
    values (new.id, chosen_username, chosen_display, 'purple')
    on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, username, display_name, avatar_color)
    values (new.id, 'student_' || substr(new.id::text, 1, 8), chosen_display, 'purple')
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_focusora on auth.users;
create trigger on_auth_user_created_focusora
after insert on auth.users
for each row execute procedure public.handle_new_focusora_user();

-- SECURITY DEFINER membership helper avoids recursive RLS policies on group_members.
create or replace function public.is_focusora_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group_id and gm.user_id = auth.uid()
  );
$$;
revoke all on function public.is_focusora_group_member(uuid) from public;
grant execute on function public.is_focusora_group_member(uuid) to authenticated;

-- Row Level Security: every user can update their own data; group rows are visible to members.
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_goals enable row level security;
alter table public.personal_goals enable row level security;
alter table public.study_tasks enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "friendships_select_participant" on public.friendships;
create policy "friendships_select_participant" on public.friendships for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists "friendships_request_self" on public.friendships;
create policy "friendships_request_self" on public.friendships for insert to authenticated with check (requester_id = auth.uid() and status = 'pending');
drop policy if exists "friendships_accept_recipient" on public.friendships;
create policy "friendships_accept_recipient" on public.friendships for update to authenticated using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
drop policy if exists "friendships_delete_participant" on public.friendships;
create policy "friendships_delete_participant" on public.friendships for delete to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "groups_select_owner_or_member" on public.study_groups;
create policy "groups_select_owner_or_member" on public.study_groups for select to authenticated using (owner_id = auth.uid() or public.is_focusora_group_member(study_groups.id));
drop policy if exists "groups_insert_self_owner" on public.study_groups;
create policy "groups_insert_self_owner" on public.study_groups for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "groups_update_owner" on public.study_groups;
create policy "groups_update_owner" on public.study_groups for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "groups_delete_owner" on public.study_groups;
create policy "groups_delete_owner" on public.study_groups for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "members_select_self_or_groupmate" on public.group_members;
create policy "members_select_self_or_groupmate" on public.group_members for select to authenticated using (user_id = auth.uid() or public.is_focusora_group_member(group_members.group_id));
drop policy if exists "members_owner_add_self" on public.group_members;
create policy "members_owner_add_self" on public.group_members for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.study_groups g where g.id = group_members.group_id and g.owner_id = auth.uid()));
drop policy if exists "members_leave_own_group" on public.group_members;
create policy "members_leave_own_group" on public.group_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists "group_goals_select_members" on public.group_goals;
create policy "group_goals_select_members" on public.group_goals for select to authenticated using (public.is_focusora_group_member(group_goals.group_id));
drop policy if exists "group_goals_insert_members" on public.group_goals;
create policy "group_goals_insert_members" on public.group_goals for insert to authenticated with check (created_by = auth.uid() and public.is_focusora_group_member(group_goals.group_id));
drop policy if exists "group_goals_update_creator" on public.group_goals;
create policy "group_goals_update_creator" on public.group_goals for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid() and public.is_focusora_group_member(group_goals.group_id));
drop policy if exists "group_goals_delete_creator" on public.group_goals;
create policy "group_goals_delete_creator" on public.group_goals for delete to authenticated using (created_by = auth.uid());

drop policy if exists "personal_goals_all_self" on public.personal_goals;
create policy "personal_goals_all_self" on public.personal_goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tasks_all_self" on public.study_tasks;
create policy "tasks_all_self" on public.study_tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sessions_select_owner_or_group_member" on public.study_sessions;
create policy "sessions_select_owner_or_group_member" on public.study_sessions for select to authenticated using (user_id = auth.uid() or (study_sessions.group_id is not null and public.is_focusora_group_member(study_sessions.group_id)));
drop policy if exists "sessions_insert_self_member" on public.study_sessions;
create policy "sessions_insert_self_member" on public.study_sessions for insert to authenticated with check (user_id = auth.uid() and (study_sessions.group_id is null or public.is_focusora_group_member(study_sessions.group_id)) and (study_sessions.personal_goal_id is null or exists (select 1 from public.personal_goals pg where pg.id = study_sessions.personal_goal_id and pg.user_id = auth.uid())));
drop policy if exists "sessions_update_self" on public.study_sessions;
create policy "sessions_update_self" on public.study_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and (study_sessions.group_id is null or public.is_focusora_group_member(study_sessions.group_id)) and (study_sessions.personal_goal_id is null or exists (select 1 from public.personal_goals pg where pg.id = study_sessions.personal_goal_id and pg.user_id = auth.uid())));
drop policy if exists "sessions_delete_self" on public.study_sessions;
create policy "sessions_delete_self" on public.study_sessions for delete to authenticated using (user_id = auth.uid());

-- The Data API needs table privileges in addition to RLS policies.
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;
grant select, insert, update, delete on public.study_groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.group_goals to authenticated;
grant select, insert, update, delete on public.personal_goals to authenticated;
grant select, insert, update, delete on public.study_tasks to authenticated;
grant select, insert, update, delete on public.study_sessions to authenticated;

-- Joining a group by code must not require public read access to all private groups.
create or replace function public.join_group_by_code(invite_code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before joining a group.';
  end if;
  select id into found_group_id
  from public.study_groups
  where upper(invite_code) = upper(trim(invite_code_input))
  limit 1;
  if found_group_id is null then
    return null;
  end if;
  insert into public.group_members (group_id, user_id, role)
  values (found_group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;
  return found_group_id;
end;
$$;
revoke all on function public.join_group_by_code(text) from public;
grant execute on function public.join_group_by_code(text) to authenticated;

-- Optional realtime updates for study-session changes. Safe to run more than once.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='study_sessions') then
      alter publication supabase_realtime add table public.study_sessions;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='group_goals') then
      alter publication supabase_realtime add table public.group_goals;
    end if;
  end if;
end $$;

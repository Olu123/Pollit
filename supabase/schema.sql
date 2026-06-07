-- ============================================================
-- Agora NG — Database Schema
-- Paste this into the Supabase SQL Editor and run it.
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique,
  full_name   text,
  avatar_url  text,
  points      integer not null default 0,
  phone       text,
  age_range   text,
  sex         text,
  birth_month integer,
  birth_day   integer,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- For existing databases: add the profile detail columns.
alter table public.profiles add column if not exists phone           text;
alter table public.profiles add column if not exists age_range       text;
alter table public.profiles add column if not exists sex             text;
alter table public.profiles add column if not exists birth_month     integer;
alter table public.profiles add column if not exists birth_day       integer;
alter table public.profiles add column if not exists bio             text;
alter table public.profiles add column if not exists state_of_origin text;
alter table public.profiles add column if not exists referred_by     uuid references public.profiles(id);
alter table public.profiles add column if not exists referral_count  integer default 0;
alter table public.profiles add column if not exists is_admin        boolean default false;

create table if not exists public.polls (
  id          uuid default gen_random_uuid() primary key,
  question    text not null,
  category    text not null,
  created_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null,
  total_votes integer not null default 0,
  is_hot_take boolean not null default false,
  is_community       boolean not null default false,
  community_name     text,
  community_code     text,
  community_password text,
  created_at  timestamptz not null default now(),
  constraint  polls_category_check check (
    category in ('Politics','Sports','Entertainment','Business','Lifestyle')
  )
);

-- Community poll columns for existing databases.
alter table public.polls add column if not exists is_community       boolean default false;
alter table public.polls add column if not exists community_name     text;
alter table public.polls add column if not exists community_code     text;
alter table public.polls add column if not exists community_password text;
alter table public.polls add column if not exists deleted_at         timestamptz;
create index if not exists polls_community_code_idx on public.polls(community_code);
create index if not exists polls_deleted_at_idx     on public.polls(deleted_at);

create table if not exists public.poll_options (
  id            uuid default gen_random_uuid() primary key,
  poll_id       uuid references public.polls(id) on delete cascade not null,
  text          text not null,
  vote_count    integer not null default 0,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.votes (
  id         uuid default gen_random_uuid() primary key,
  poll_id    uuid references public.polls(id) on delete cascade not null,
  option_id  uuid references public.poll_options(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  comment    text,
  state      text,
  created_at timestamptz not null default now(),
  unique(poll_id, user_id)
);

-- For existing databases: add the optional comment + state columns.
alter table public.votes add column if not exists comment text;
alter table public.votes add column if not exists state   text;
alter table public.votes add column if not exists changed_at          timestamptz;
alter table public.votes add column if not exists original_option_id  uuid references public.poll_options(id);
alter table public.votes drop constraint if exists votes_comment_len;
alter table public.votes add constraint votes_comment_len
  check (comment is null or char_length(comment) <= 280);

-- ── Indexes ──────────────────────────────────────────────────

create index if not exists polls_created_by_idx  on public.polls(created_by);
create index if not exists polls_category_idx    on public.polls(category);
create index if not exists polls_expires_at_idx  on public.polls(expires_at);
create index if not exists options_poll_id_idx   on public.poll_options(poll_id);
create index if not exists votes_poll_id_idx     on public.votes(poll_id);
create index if not exists votes_user_id_idx     on public.votes(user_id);

-- ── Row Level Security ────────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes        enable row level security;

-- Profiles
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Polls
create policy "polls_read"   on public.polls for select using (true);
create policy "polls_insert" on public.polls for insert with check (auth.uid() = created_by);
drop policy if exists "creators_can_update_polls" on public.polls;
create policy "creators_can_update_polls" on public.polls for update using (auth.uid() = created_by);

-- Poll options
create policy "options_read"   on public.poll_options for select using (true);
create policy "options_insert" on public.poll_options for insert with check (
  exists (select 1 from public.polls where id = poll_id and created_by = auth.uid())
);

-- Votes
create policy "votes_read"   on public.votes for select using (true);
create policy "votes_insert" on public.votes for insert with check (auth.uid() = user_id);

-- ── Reports ───────────────────────────────────────────────────

create table if not exists public.reports (
  id          uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id),
  poll_id     uuid references public.polls(id),
  comment_id  uuid references public.votes(id),
  reason      text not null,
  created_at  timestamptz default now()
);

alter table public.reports enable row level security;
create policy "reports_insert" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "reports_read_admin" on public.reports for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- ── Contact messages ──────────────────────────────────────────

create table if not exists public.contact_messages (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  email      text not null,
  subject    text not null,
  message    text not null,
  username   text,
  user_id    uuid references public.profiles(id),
  status     text default 'unread',
  created_at timestamptz default now()
);

alter table public.contact_messages enable row level security;

create policy "anyone_can_contact" on public.contact_messages for insert with check (true);
create policy "admins_can_read_messages" on public.contact_messages for select using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "admins_can_update_messages" on public.contact_messages for update using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Lets the contact API rate-limit by email without exposing the table.
create or replace function public.count_recent_contacts(p_email text)
returns integer
language sql security definer set search_path = public
as $$
  select count(*)::int
  from contact_messages
  where email = p_email and created_at > now() - interval '1 hour';
$$;

-- ── RPC: cast_vote ────────────────────────────────────────────
-- Atomically inserts a vote (with optional comment), increments
-- counts, awards 10 tokens.

-- Drop older signatures so PostgREST resolves to the newest one.
drop function if exists public.cast_vote(uuid, uuid);
drop function if exists public.cast_vote(uuid, uuid, text);
drop function if exists public.cast_vote(uuid, uuid, text, text);

create or replace function public.cast_vote(
  p_poll_id   uuid,
  p_option_id uuid,
  p_comment   text default null,
  p_state     text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_state   text := nullif(btrim(p_state), '');
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_comment is not null and char_length(v_comment) > 280 then
    raise exception 'comment_too_long';
  end if;

  insert into votes (poll_id, option_id, user_id, comment, state)
  values (p_poll_id, p_option_id, v_uid, v_comment, v_state);

  update poll_options set vote_count = vote_count + 1 where id = p_option_id;
  update polls         set total_votes = total_votes + 1 where id = p_poll_id;
  update profiles      set points = points + 5, updated_at = now() where id = v_uid;

  return jsonb_build_object('success', true);
exception
  when unique_violation then raise exception 'already_voted';
end;
$$;

-- ── RPC: create_poll ──────────────────────────────────────────
-- Atomically creates a poll + options, awards 30 tokens.

-- Add the is_hot_take column to existing databases.
alter table public.polls add column if not exists is_hot_take boolean default false;

-- Drop older signatures so PostgREST resolves to the newest one.
drop function if exists public.create_poll(text, text, text[], timestamptz);
drop function if exists public.create_poll(text, text, text[], timestamptz, boolean);
drop function if exists public.create_poll(text, text, text[], timestamptz, boolean, boolean, text, text, text);

create or replace function public.create_poll(
  p_question     text,
  p_category     text,
  p_options      text[],
  p_expires_at   timestamptz,
  p_is_hot_take  boolean default false,
  p_is_community boolean default false,
  p_community_name     text default null,
  p_community_code     text default null,
  p_community_password text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_poll_id uuid;
  v_idx     int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if array_length(p_options, 1) < 2 then raise exception 'min_2_options'; end if;

  insert into polls (question, category, created_by, expires_at, is_hot_take,
                     is_community, community_name, community_code, community_password)
  values (p_question, p_category, v_uid, p_expires_at, coalesce(p_is_hot_take, false),
          coalesce(p_is_community, false),
          nullif(btrim(p_community_name), ''),
          nullif(btrim(p_community_code), ''),
          nullif(btrim(p_community_password), ''))
  returning id into v_poll_id;

  for v_idx in 1 .. array_length(p_options, 1) loop
    insert into poll_options (poll_id, text, display_order)
    values (v_poll_id, p_options[v_idx], v_idx);
  end loop;

  update profiles set points = points + 20, updated_at = now() where id = v_uid;

  return v_poll_id;
end;
$$;

-- ── RPC: claim_referral ───────────────────────────────────────
-- Links the caller to a referrer (once) and awards the referrer 100 tokens.
-- Security definer so it can update the referrer's row past RLS.

create or replace function public.claim_referral(p_referrer_username text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false); end if;

  -- Only link once.
  if exists (select 1 from profiles where id = v_uid and referred_by is not null) then
    return jsonb_build_object('ok', false, 'reason', 'already_referred');
  end if;

  select id into v_ref from profiles where username = p_referrer_username;
  if v_ref is null or v_ref = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'invalid_referrer');
  end if;

  update profiles set referred_by = v_ref where id = v_uid;
  update profiles
     set referral_count = coalesce(referral_count, 0) + 1,
         points = points + 30,
         updated_at = now()
   where id = v_ref;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── RPC: delete_poll (soft delete) ────────────────────────────

create or replace function public.delete_poll(p_poll_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_poll polls%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_poll from polls where id = p_poll_id;
  if not found then raise exception 'poll_not_found'; end if;

  if v_poll.created_by != v_uid then
    if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
      raise exception 'not_authorized';
    end if;
  end if;

  if v_poll.total_votes >= 10 then
    raise exception 'too_many_votes';
  end if;

  update polls set deleted_at = now() where id = p_poll_id;
  return jsonb_build_object('success', true);
end;
$$;

-- ── RPC: edit_poll (60-second window) ──────────────────────────

create or replace function public.edit_poll(
  p_poll_id  uuid,
  p_question text,
  p_options  jsonb   -- array of { id: uuid, text: string }
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_poll polls%rowtype;
  v_option jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_poll from polls where id = p_poll_id;
  if not found then raise exception 'poll_not_found'; end if;
  if v_poll.created_by != v_uid then raise exception 'not_authorized'; end if;

  if now() > v_poll.created_at + interval '60 seconds' then
    raise exception 'edit_window_expired';
  end if;

  update polls set question = p_question where id = p_poll_id;

  for v_option in select * from jsonb_array_elements(p_options)
  loop
    update poll_options
       set text = v_option->>'text'
     where id = (v_option->>'id')::uuid
       and poll_id = p_poll_id;
  end loop;

  return jsonb_build_object('success', true);
end;
$$;

-- ── RPC: change_vote (60-second window) ────────────────────────

create or replace function public.change_vote(
  p_poll_id       uuid,
  p_new_option_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_vote votes%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_vote from votes where poll_id = p_poll_id and user_id = v_uid;
  if not found then raise exception 'no_vote_found'; end if;

  if now() > v_vote.created_at + interval '60 seconds' then
    raise exception 'change_window_expired';
  end if;
  if v_vote.option_id = p_new_option_id then
    raise exception 'same_option';
  end if;

  update poll_options set vote_count = vote_count - 1 where id = v_vote.option_id;
  update poll_options set vote_count = vote_count + 1 where id = p_new_option_id;

  update votes set
    option_id = p_new_option_id,
    original_option_id = coalesce(v_vote.original_option_id, v_vote.option_id),
    changed_at = now()
  where poll_id = p_poll_id and user_id = v_uid;

  return jsonb_build_object('success', true);
end;
$$;

-- ── Trigger: auto-create profile on signup ────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'preferred_username',
      split_part(coalesce(new.email,''), '@', 1),
      'user_' || substr(new.id::text, 1, 8)
    ),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Realtime ─────────────────────────────────────────────────
-- Run each line separately if you get a "already member" error.

alter publication supabase_realtime add table public.poll_options;
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.votes;

-- ══════════════════════════════════════════════════════════════
-- Admin Dashboard — additions
-- ══════════════════════════════════════════════════════════════

-- ── Column additions ──────────────────────────────────────────
alter table public.profiles add column if not exists is_suspended boolean default false;
alter table public.polls    add column if not exists is_pinned    boolean default false;
alter table public.reports  add column if not exists status       text default 'open';

-- ── Announcements ─────────────────────────────────────────────
create table if not exists public.announcements (
  id         uuid default gen_random_uuid() primary key,
  message    text not null,
  is_active  boolean default true,
  created_by uuid references public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;
create policy "announcements_read"         on public.announcements for select using (true);
create policy "announcements_admin_insert" on public.announcements for insert with check (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "announcements_admin_update" on public.announcements for update using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "announcements_admin_delete" on public.announcements for delete using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- ── Token transactions ────────────────────────────────────────
create table if not exists public.token_transactions (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id),
  amount     integer not null,
  reason     text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.token_transactions enable row level security;
create policy "token_tx_own_read"  on public.token_transactions for select using (auth.uid() = user_id);
create policy "token_tx_admin_all" on public.token_transactions for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- ── Suspensions ───────────────────────────────────────────────
create table if not exists public.suspensions (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id),
  reason       text not null,
  suspended_by uuid references public.profiles(id),
  suspended_at timestamptz default now(),
  lifted_at    timestamptz
);
alter table public.suspensions enable row level security;
create policy "suspensions_admin_all" on public.suspensions for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- ── RPC: admin_get_users ──────────────────────────────────────
create or replace function public.admin_get_users()
returns table(
  id           uuid,
  username     text,
  email        text,
  points       integer,
  is_admin     boolean,
  is_suspended boolean,
  created_at   timestamptz,
  poll_count   bigint,
  vote_count   bigint
)
language sql security definer set search_path = public
as $$
  select
    p.id,
    p.username,
    coalesce(u.email, '') as email,
    p.points,
    coalesce(p.is_admin, false),
    coalesce(p.is_suspended, false),
    p.created_at,
    (select count(*) from polls where created_by = p.id and deleted_at is null)::bigint,
    (select count(*) from votes where user_id = p.id)::bigint
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
$$;
grant execute on function public.admin_get_users() to authenticated;

-- ── RPC: admin_suspend_user ───────────────────────────────────
create or replace function public.admin_suspend_user(p_user_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update profiles set is_suspended = true where id = p_user_id;
  insert into suspensions (user_id, reason, suspended_by) values (p_user_id, p_reason, v_uid);
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_suspend_user(uuid, text) to authenticated;

-- ── RPC: admin_unsuspend_user ─────────────────────────────────
create or replace function public.admin_unsuspend_user(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update profiles set is_suspended = false where id = p_user_id;
  update suspensions set lifted_at = now() where user_id = p_user_id and lifted_at is null;
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_unsuspend_user(uuid) to authenticated;

-- ── RPC: admin_toggle_admin ───────────────────────────────────
create or replace function public.admin_toggle_admin(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_new boolean; begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  if p_user_id = v_uid then raise exception 'cannot_modify_self'; end if;
  update profiles set is_admin = not coalesce(is_admin, false)
  where id = p_user_id returning is_admin into v_new;
  return jsonb_build_object('success', true, 'is_admin', v_new);
end; $$;
grant execute on function public.admin_toggle_admin(uuid) to authenticated;

-- ── RPC: admin_adjust_tokens ──────────────────────────────────
create or replace function public.admin_adjust_tokens(p_user_id uuid, p_amount integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update profiles set points = points + p_amount, updated_at = now() where id = p_user_id;
  insert into token_transactions (user_id, amount, reason, created_by)
  values (p_user_id, p_amount, p_reason, v_uid);
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_adjust_tokens(uuid, integer, text) to authenticated;

-- ── RPC: admin_delete_poll (no vote limit) ────────────────────
create or replace function public.admin_delete_poll(p_poll_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update polls set deleted_at = now() where id = p_poll_id;
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_delete_poll(uuid) to authenticated;

-- ── RPC: admin_restore_poll ───────────────────────────────────
create or replace function public.admin_restore_poll(p_poll_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update polls set deleted_at = null where id = p_poll_id;
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_restore_poll(uuid) to authenticated;

-- ── RPC: admin_toggle_pin ─────────────────────────────────────
create or replace function public.admin_toggle_pin(p_poll_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_new boolean; begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update polls set is_pinned = not coalesce(is_pinned, false)
  where id = p_poll_id returning is_pinned into v_new;
  return jsonb_build_object('success', true, 'is_pinned', v_new);
end; $$;
grant execute on function public.admin_toggle_pin(uuid) to authenticated;

-- ── RPC: admin_toggle_hot_take ────────────────────────────────
create or replace function public.admin_toggle_hot_take(p_poll_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_new boolean; begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update polls set is_hot_take = not coalesce(is_hot_take, false)
  where id = p_poll_id returning is_hot_take into v_new;
  return jsonb_build_object('success', true, 'is_hot_take', v_new);
end; $$;
grant execute on function public.admin_toggle_hot_take(uuid) to authenticated;

-- ── RPC: admin_dismiss_report ─────────────────────────────────
create or replace function public.admin_dismiss_report(p_report_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update reports set status = 'dismissed' where id = p_report_id;
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_dismiss_report(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════
-- Challenges + Rate limiting — additions
-- ══════════════════════════════════════════════════════════════

-- ── Challenge columns on polls ────────────────────────────────
alter table public.polls add column if not exists is_challenge          boolean not null default false;
alter table public.polls add column if not exists challenge_pool        integer not null default 0;
alter table public.polls add column if not exists challenge_status      text    not null default 'active';
alter table public.polls add column if not exists challenge_distributed boolean not null default false;
alter table public.polls add column if not exists challenge_distributed_at timestamptz;
create index if not exists polls_is_challenge_idx on public.polls(is_challenge);

-- ── Challenge participants ────────────────────────────────────
create table if not exists public.challenge_participants (
  id        uuid default gen_random_uuid() primary key,
  poll_id   uuid references public.polls(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  option_id uuid references public.poll_options(id) on delete set null,
  reward    integer not null default 0,
  joined_at timestamptz not null default now(),
  unique (poll_id, user_id)
);
create index if not exists cp_poll_id_idx on public.challenge_participants(poll_id);
create index if not exists cp_user_id_idx on public.challenge_participants(user_id);

alter table public.challenge_participants enable row level security;
create policy "cp_read"   on public.challenge_participants for select using (true);
create policy "cp_insert" on public.challenge_participants for insert with check (auth.uid() = user_id);

-- ── RPC: cast_vote (v2 — hourly rate limit) ───────────────────
-- Max 30 votes per hour per user. Raises hourly_vote_limit_reached.
create or replace function public.cast_vote(
  p_poll_id   uuid,
  p_option_id uuid,
  p_comment   text default null,
  p_state     text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_state   text := nullif(btrim(p_state), '');
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_comment is not null and char_length(v_comment) > 280 then
    raise exception 'comment_too_long';
  end if;

  -- Rate limit: max 30 votes per hour per user.
  if (select count(*) from votes
        where user_id = v_uid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'hourly_vote_limit_reached';
  end if;

  insert into votes (poll_id, option_id, user_id, comment, state)
  values (p_poll_id, p_option_id, v_uid, v_comment, v_state);

  update poll_options set vote_count = vote_count + 1 where id = p_option_id;
  update polls         set total_votes = total_votes + 1 where id = p_poll_id;
  update profiles      set points = points + 5, updated_at = now() where id = v_uid;

  return jsonb_build_object('success', true);
exception
  when unique_violation then raise exception 'already_voted';
end;
$$;

-- ── RPC: create_poll (v2 — challenge + daily rate limit) ──────
-- Max 5 polls per day per user. Raises daily_poll_limit_reached.
-- p_is_challenge requires the caller to be an admin.
drop function if exists public.create_poll(text, text, text[], timestamptz, boolean, boolean, text, text, text);

create or replace function public.create_poll(
  p_question     text,
  p_category     text,
  p_options      text[],
  p_expires_at   timestamptz,
  p_is_hot_take  boolean default false,
  p_is_community boolean default false,
  p_community_name     text default null,
  p_community_code     text default null,
  p_community_password text default null,
  p_is_challenge   boolean default false,
  p_challenge_pool integer default 0
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_poll_id uuid;
  v_idx     int;
  v_is_challenge boolean := coalesce(p_is_challenge, false);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if array_length(p_options, 1) < 2 then raise exception 'min_2_options'; end if;

  -- Rate limit: max 5 polls per day per user.
  if (select count(*) from polls
        where created_by = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'daily_poll_limit_reached';
  end if;

  -- Only admins may create challenges.
  if v_is_challenge and not exists (
    select 1 from profiles where id = v_uid and is_admin = true
  ) then
    raise exception 'not_authorized';
  end if;

  insert into polls (question, category, created_by, expires_at, is_hot_take,
                     is_community, community_name, community_code, community_password,
                     is_challenge, challenge_pool, challenge_status)
  values (p_question, p_category, v_uid, p_expires_at, coalesce(p_is_hot_take, false),
          coalesce(p_is_community, false),
          nullif(btrim(p_community_name), ''),
          nullif(btrim(p_community_code), ''),
          nullif(btrim(p_community_password), ''),
          v_is_challenge,
          case when v_is_challenge then greatest(coalesce(p_challenge_pool, 0), 0) else 0 end,
          'active')
  returning id into v_poll_id;

  for v_idx in 1 .. array_length(p_options, 1) loop
    insert into poll_options (poll_id, text, display_order)
    values (v_poll_id, p_options[v_idx], v_idx);
  end loop;

  update profiles set points = points + 20, updated_at = now() where id = v_uid;

  return v_poll_id;
end;
$$;

-- ── RPC: join_challenge ───────────────────────────────────────
-- Casts a vote on a challenge poll and registers the user as a participant.
-- Shares the hourly rate limit and +10 token reward with cast_vote; the
-- challenge pool is paid out separately via distribute_challenge_tokens.
create or replace function public.join_challenge(
  p_poll_id   uuid,
  p_option_id uuid,
  p_comment   text default null,
  p_state     text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_state   text := nullif(btrim(p_state), '');
  v_poll    polls%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_poll from polls where id = p_poll_id;
  if not found then raise exception 'poll_not_found'; end if;
  if not v_poll.is_challenge then raise exception 'not_a_challenge'; end if;
  if coalesce(v_poll.challenge_status, 'active') <> 'active' then
    raise exception 'challenge_not_active';
  end if;
  if v_poll.expires_at <= now() then raise exception 'challenge_not_active'; end if;

  if v_comment is not null and char_length(v_comment) > 280 then
    raise exception 'comment_too_long';
  end if;

  -- Rate limit: max 30 votes per hour per user.
  if (select count(*) from votes
        where user_id = v_uid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'hourly_vote_limit_reached';
  end if;

  insert into votes (poll_id, option_id, user_id, comment, state)
  values (p_poll_id, p_option_id, v_uid, v_comment, v_state);

  insert into challenge_participants (poll_id, user_id, option_id)
  values (p_poll_id, v_uid, p_option_id);

  update poll_options set vote_count = vote_count + 1 where id = p_option_id;
  update polls         set total_votes = total_votes + 1 where id = p_poll_id;
  update profiles      set points = points + 7, updated_at = now() where id = v_uid;

  return jsonb_build_object('success', true);
exception
  when unique_violation then raise exception 'already_voted';
end;
$$;
grant execute on function public.join_challenge(uuid, uuid, text, text) to authenticated;

-- ── RPC: distribute_challenge_tokens ──────────────────────────
-- Admin-only. Splits the challenge pool equally among all participants,
-- credits their token balances, logs token_transactions, and marks the
-- challenge completed + distributed (idempotent).
create or replace function public.distribute_challenge_tokens(p_poll_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_poll   polls%rowtype;
  v_count  integer;
  v_each   integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;

  select * into v_poll from polls where id = p_poll_id;
  if not found then raise exception 'poll_not_found'; end if;
  if not v_poll.is_challenge then raise exception 'not_a_challenge'; end if;
  if v_poll.challenge_distributed then raise exception 'already_distributed'; end if;

  select count(*) into v_count from challenge_participants where poll_id = p_poll_id;
  if v_count = 0 then
    update polls
       set challenge_distributed = true, challenge_status = 'completed',
           challenge_distributed_at = now()
     where id = p_poll_id;
    return jsonb_build_object('success', true, 'participants', 0, 'each', 0);
  end if;

  v_each := floor(coalesce(v_poll.challenge_pool, 0) / v_count);

  if v_each > 0 then
    update challenge_participants set reward = v_each where poll_id = p_poll_id;

    update profiles p
       set points = points + v_each, updated_at = now()
      from challenge_participants cp
     where cp.poll_id = p_poll_id and cp.user_id = p.id;

    insert into token_transactions (user_id, amount, reason, created_by)
    select cp.user_id, v_each, 'Challenge reward', v_uid
      from challenge_participants cp
     where cp.poll_id = p_poll_id;
  end if;

  update polls
     set challenge_distributed = true, challenge_status = 'completed'
   where id = p_poll_id;

  return jsonb_build_object('success', true, 'participants', v_count, 'each', v_each);
end;
$$;
grant execute on function public.distribute_challenge_tokens(uuid) to authenticated;

-- ── Realtime ──────────────────────────────────────────────────
alter publication supabase_realtime add table public.challenge_participants;

-- ══════════════════════════════════════════════════════════════
-- Token Transparency — immutable public ledger
-- ══════════════════════════════════════════════════════════════

-- ── Extend token_transactions into a full ledger ──────────────
alter table public.token_transactions add column if not exists username    text;
alter table public.token_transactions add column if not exists reason_type text;
alter table public.token_transactions add column if not exists poll_id     uuid references public.polls(id) on delete set null;

-- Preserve ledger rows when a referenced user is deleted (denormalized
-- username keeps them readable). Rebuild the FKs with on delete set null.
alter table public.token_transactions drop constraint if exists token_transactions_user_id_fkey;
alter table public.token_transactions
  add constraint token_transactions_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;
alter table public.token_transactions drop constraint if exists token_transactions_created_by_fkey;
alter table public.token_transactions
  add constraint token_transactions_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- Backfill reason_type / username for any pre-existing rows.
update public.token_transactions set reason_type = case
  when reason ilike 'challenge%' then 'challenge'
  when reason ilike 'vote%'      then 'vote'
  when reason ilike '%poll%'     then 'poll_created'
  when reason ilike 'referral%'  then 'referral'
  else 'admin_adjustment'
end
where reason_type is null;

update public.token_transactions tt
   set username = p.username
  from public.profiles p
 where p.id = tt.user_id and tt.username is null;

alter table public.token_transactions alter column reason_type set default 'admin_adjustment';
alter table public.token_transactions alter column reason_type set not null;

create index if not exists tt_created_at_idx  on public.token_transactions(created_at desc);
create index if not exists tt_reason_type_idx on public.token_transactions(reason_type);
create index if not exists tt_username_idx     on public.token_transactions(username);

-- ── RLS: public read, authenticated insert, never delete ──────
-- Drop the older private policies so transparency rules apply cleanly.
drop policy if exists "token_tx_own_read"        on public.token_transactions;
drop policy if exists "token_tx_admin_all"       on public.token_transactions;
drop policy if exists "transactions_public_read" on public.token_transactions;
drop policy if exists "transactions_no_delete"   on public.token_transactions;
drop policy if exists "transactions_insert"      on public.token_transactions;

-- Anyone can READ transactions (full transparency).
create policy "transactions_public_read"
  on public.token_transactions for select using (true);

-- NO ONE can delete transactions (immutability).
create policy "transactions_no_delete"
  on public.token_transactions for delete using (false);

-- Only authenticated users can insert (real writes go through SECURITY
-- DEFINER RPCs below, which run as the table owner regardless).
create policy "transactions_insert"
  on public.token_transactions for insert
  with check (auth.role() = 'authenticated');

-- ── Daily summary table (chart source; computed on the fly for now) ──
create table if not exists public.daily_token_summaries (
  id                 uuid default gen_random_uuid() primary key,
  date               date not null unique,
  tokens_distributed integer not null default 0,
  transaction_count  integer not null default 0,
  new_users          integer not null default 0,
  created_at         timestamptz default now()
);
alter table public.daily_token_summaries enable row level security;
create policy "daily_summaries_public_read"
  on public.daily_token_summaries for select using (true);

-- ══════════════════════════════════════════════════════════════
-- Award RPCs — final versions that also write to the ledger
-- (later create-or-replace definitions win over the ones above)
-- ══════════════════════════════════════════════════════════════

-- ── cast_vote (v3 — ledger) ───────────────────────────────────
create or replace function public.cast_vote(
  p_poll_id   uuid,
  p_option_id uuid,
  p_comment   text default null,
  p_state     text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_state   text := nullif(btrim(p_state), '');
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_comment is not null and char_length(v_comment) > 280 then
    raise exception 'comment_too_long';
  end if;

  if (select count(*) from votes
        where user_id = v_uid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'hourly_vote_limit_reached';
  end if;

  insert into votes (poll_id, option_id, user_id, comment, state)
  values (p_poll_id, p_option_id, v_uid, v_comment, v_state);

  update poll_options set vote_count = vote_count + 1 where id = p_option_id;
  update polls         set total_votes = total_votes + 1 where id = p_poll_id;
  update profiles      set points = points + 5, updated_at = now() where id = v_uid;

  insert into token_transactions (user_id, username, amount, reason, reason_type, poll_id)
  select v_uid, p.username, 5, 'Vote reward', 'vote', p_poll_id
  from profiles p where p.id = v_uid;

  return jsonb_build_object('success', true);
exception
  when unique_violation then raise exception 'already_voted';
end;
$$;

-- ── create_poll (v3 — ledger) ─────────────────────────────────
create or replace function public.create_poll(
  p_question     text,
  p_category     text,
  p_options      text[],
  p_expires_at   timestamptz,
  p_is_hot_take  boolean default false,
  p_is_community boolean default false,
  p_community_name     text default null,
  p_community_code     text default null,
  p_community_password text default null,
  p_is_challenge   boolean default false,
  p_challenge_pool integer default 0
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_poll_id uuid;
  v_idx     int;
  v_is_challenge boolean := coalesce(p_is_challenge, false);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if array_length(p_options, 1) < 2 then raise exception 'min_2_options'; end if;

  if (select count(*) from polls
        where created_by = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'daily_poll_limit_reached';
  end if;

  if v_is_challenge and not exists (
    select 1 from profiles where id = v_uid and is_admin = true
  ) then
    raise exception 'not_authorized';
  end if;

  insert into polls (question, category, created_by, expires_at, is_hot_take,
                     is_community, community_name, community_code, community_password,
                     is_challenge, challenge_pool, challenge_status)
  values (p_question, p_category, v_uid, p_expires_at, coalesce(p_is_hot_take, false),
          coalesce(p_is_community, false),
          nullif(btrim(p_community_name), ''),
          nullif(btrim(p_community_code), ''),
          nullif(btrim(p_community_password), ''),
          v_is_challenge,
          case when v_is_challenge then greatest(coalesce(p_challenge_pool, 0), 0) else 0 end,
          'active')
  returning id into v_poll_id;

  for v_idx in 1 .. array_length(p_options, 1) loop
    insert into poll_options (poll_id, text, display_order)
    values (v_poll_id, p_options[v_idx], v_idx);
  end loop;

  update profiles set points = points + 20, updated_at = now() where id = v_uid;

  insert into token_transactions (user_id, username, amount, reason, reason_type, poll_id)
  select v_uid, p.username, 20, 'Poll creation reward', 'poll_created', v_poll_id
  from profiles p where p.id = v_uid;

  return v_poll_id;
end;
$$;

-- ── join_challenge (v2 — ledger) ──────────────────────────────
create or replace function public.join_challenge(
  p_poll_id   uuid,
  p_option_id uuid,
  p_comment   text default null,
  p_state     text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_state   text := nullif(btrim(p_state), '');
  v_poll    polls%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_poll from polls where id = p_poll_id;
  if not found then raise exception 'poll_not_found'; end if;
  if not v_poll.is_challenge then raise exception 'not_a_challenge'; end if;
  if coalesce(v_poll.challenge_status, 'active') <> 'active' then
    raise exception 'challenge_not_active';
  end if;
  if v_poll.expires_at <= now() then raise exception 'challenge_not_active'; end if;

  if v_comment is not null and char_length(v_comment) > 280 then
    raise exception 'comment_too_long';
  end if;

  if (select count(*) from votes
        where user_id = v_uid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'hourly_vote_limit_reached';
  end if;

  insert into votes (poll_id, option_id, user_id, comment, state)
  values (p_poll_id, p_option_id, v_uid, v_comment, v_state);

  insert into challenge_participants (poll_id, user_id, option_id)
  values (p_poll_id, v_uid, p_option_id);

  update poll_options set vote_count = vote_count + 1 where id = p_option_id;
  update polls         set total_votes = total_votes + 1 where id = p_poll_id;
  update profiles      set points = points + 7, updated_at = now() where id = v_uid;

  insert into token_transactions (user_id, username, amount, reason, reason_type, poll_id)
  select v_uid, p.username, 7, 'Challenge join reward', 'challenge', p_poll_id
  from profiles p where p.id = v_uid;

  return jsonb_build_object('success', true);
exception
  when unique_violation then raise exception 'already_voted';
end;
$$;
grant execute on function public.join_challenge(uuid, uuid, text, text) to authenticated;

-- ── claim_referral (v2 — ledger) ──────────────────────────────
create or replace function public.claim_referral(p_referrer_username text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false); end if;

  if exists (select 1 from profiles where id = v_uid and referred_by is not null) then
    return jsonb_build_object('ok', false, 'reason', 'already_referred');
  end if;

  select id into v_ref from profiles where username = p_referrer_username;
  if v_ref is null or v_ref = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'invalid_referrer');
  end if;

  update profiles set referred_by = v_ref where id = v_uid;
  update profiles
     set referral_count = coalesce(referral_count, 0) + 1,
         points = points + 30,
         updated_at = now()
   where id = v_ref;

  insert into token_transactions (user_id, username, amount, reason, reason_type, created_by)
  select v_ref, p.username, 30, 'Referral reward', 'referral', v_uid
  from profiles p where p.id = v_ref;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── admin_adjust_tokens (v2 — ledger reason_type) ─────────────
create or replace function public.admin_adjust_tokens(p_user_id uuid, p_amount integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update profiles set points = points + p_amount, updated_at = now() where id = p_user_id;
  insert into token_transactions (user_id, username, amount, reason, reason_type, created_by)
  select p_user_id, p.username, p_amount, p_reason, 'admin_adjustment', v_uid
  from profiles p where p.id = p_user_id;
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_adjust_tokens(uuid, integer, text) to authenticated;

-- ── distribute_challenge_tokens (v2 — per-participant ledger) ─
create or replace function public.distribute_challenge_tokens(p_poll_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_poll   polls%rowtype;
  v_count  integer;
  v_each   integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;

  select * into v_poll from polls where id = p_poll_id;
  if not found then raise exception 'poll_not_found'; end if;
  if not v_poll.is_challenge then raise exception 'not_a_challenge'; end if;
  if v_poll.challenge_distributed then raise exception 'already_distributed'; end if;

  select count(*) into v_count from challenge_participants where poll_id = p_poll_id;
  if v_count = 0 then
    update polls
       set challenge_distributed = true, challenge_status = 'completed',
           challenge_distributed_at = now()
     where id = p_poll_id;
    return jsonb_build_object('success', true, 'participants', 0, 'each', 0);
  end if;

  v_each := floor(coalesce(v_poll.challenge_pool, 0) / v_count);

  if v_each > 0 then
    update challenge_participants set reward = v_each where poll_id = p_poll_id;

    update profiles p
       set points = points + v_each, updated_at = now()
      from challenge_participants cp
     where cp.poll_id = p_poll_id and cp.user_id = p.id;

    insert into token_transactions (user_id, username, amount, reason, reason_type, poll_id, created_by)
    select
      cp.user_id,
      p.username,
      v_each,
      'Challenge payout: ' || v_poll.question,
      'challenge',
      p_poll_id,
      v_uid
    from challenge_participants cp
    join profiles p on p.id = cp.user_id
    where cp.poll_id = p_poll_id;
  end if;

  update polls
     set challenge_distributed = true, challenge_status = 'completed',
         challenge_distributed_at = now()
   where id = p_poll_id;

  return jsonb_build_object('success', true, 'participants', v_count, 'each', v_each);
end;
$$;
grant execute on function public.distribute_challenge_tokens(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════
-- Transparency read RPCs (public — anon + authenticated)
-- ══════════════════════════════════════════════════════════════

-- Total distributed (sum of positive amounts) and circulating (net sum).
create or replace function public.transparency_supply()
returns table(distributed bigint, circulating bigint)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(amount) filter (where amount > 0), 0)::bigint as distributed,
    coalesce(sum(amount), 0)::bigint                           as circulating
  from token_transactions;
$$;
grant execute on function public.transparency_supply() to anon, authenticated;

-- Distribution breakdown by reason_type (positive amounts only).
create or replace function public.transparency_by_type()
returns table(reason_type text, total bigint, tx_count bigint)
language sql stable security definer set search_path = public as $$
  select reason_type,
         coalesce(sum(amount) filter (where amount > 0), 0)::bigint as total,
         count(*)::bigint                                           as tx_count
  from token_transactions
  group by reason_type
  order by total desc;
$$;
grant execute on function public.transparency_by_type() to anon, authenticated;

-- Daily distributed totals over the last p_days days (chart source).
create or replace function public.transparency_daily(p_days int default 30)
returns table(date date, tokens_distributed bigint, transaction_count bigint)
language sql stable security definer set search_path = public as $$
  select date_trunc('day', created_at)::date                       as date,
         coalesce(sum(amount) filter (where amount > 0), 0)::bigint as tokens_distributed,
         count(*)::bigint                                           as transaction_count
  from token_transactions
  where created_at > now() - make_interval(days => greatest(p_days, 1))
  group by 1
  order by 1;
$$;
grant execute on function public.transparency_daily(int) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════
-- Account age restrictions + behavioural flagging (anti-abuse)
-- Final create-or-replace definitions of cast_vote / create_poll /
-- join_challenge live here and win over the ledger versions above.
-- ══════════════════════════════════════════════════════════════

-- ── New profile + poll columns ────────────────────────────────
alter table public.profiles
  add column if not exists first_vote_at timestamptz,
  add column if not exists first_poll_at timestamptz,
  add column if not exists flag_count    integer default 0,
  add column if not exists last_flag_at  timestamptz,
  add column if not exists admin_notes   text;

alter table public.polls
  add column if not exists is_flagged boolean default false;
create index if not exists polls_is_flagged_idx on public.polls(is_flagged) where is_flagged;

-- ── Device / session tracking (hashed IP for privacy) ─────────
create table if not exists public.device_sessions (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade,
  ip_hash    text,
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists ds_user_id_idx on public.device_sessions(user_id);
create index if not exists ds_ip_hash_idx on public.device_sessions(ip_hash);

alter table public.device_sessions enable row level security;

drop policy if exists "device_sessions_insert"      on public.device_sessions;
drop policy if exists "admins_read_device_sessions" on public.device_sessions;

create policy "device_sessions_insert"
  on public.device_sessions for insert
  with check (auth.uid() = user_id);

create policy "admins_read_device_sessions"
  on public.device_sessions for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ── Suspicious activity flags ─────────────────────────────────
-- flag_type ∈ rapid_voting | new_account_burst | poll_creation_burst
--            | ip_cluster | device_cluster | coordinated_voting
create table if not exists public.suspicious_flags (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  flag_type   text not null,
  details     jsonb,
  resolved    boolean default false,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at  timestamptz default now()
);
create index if not exists sf_user_id_idx    on public.suspicious_flags(user_id);
create index if not exists sf_unresolved_idx on public.suspicious_flags(resolved, created_at) where not resolved;
create index if not exists sf_type_idx       on public.suspicious_flags(flag_type);

alter table public.suspicious_flags enable row level security;

drop policy if exists "admins_manage_flags" on public.suspicious_flags;
create policy "admins_manage_flags"
  on public.suspicious_flags for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ── RPC: check_suspicious_behaviour ───────────────────────────
-- Called at the end of cast_vote / join_challenge / create_poll.
-- Raises a flag (and bumps profiles.flag_count) when a threshold trips.
-- Dedupes: skips if an unresolved flag of the same type was raised in
-- the last hour, so a single binge doesn't spam dozens of flags.
create or replace function public.check_suspicious_behaviour(
  p_user_id uuid,
  p_poll_id uuid,
  p_action  text            -- 'vote' or 'poll_created'
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_votes_last_10min  integer;
  v_votes_last_hour   integer;
  v_polls_last_hour   integer;
  v_account_age_hours numeric;
  v_existing_flag     uuid;
begin
  select extract(epoch from (now() - created_at)) / 3600
    into v_account_age_hours
  from profiles where id = p_user_id;

  if p_action = 'vote' then
    select count(*) into v_votes_last_10min
    from votes
    where user_id = p_user_id and created_at > now() - interval '10 minutes';

    select count(*) into v_votes_last_hour
    from votes
    where user_id = p_user_id and created_at > now() - interval '1 hour';

    -- Flag: voting too fast (10+ votes in 10 min)
    if v_votes_last_10min >= 10 then
      select id into v_existing_flag from suspicious_flags
      where user_id = p_user_id and flag_type = 'rapid_voting'
        and not resolved and created_at > now() - interval '1 hour'
      limit 1;

      if v_existing_flag is null then
        insert into suspicious_flags (user_id, flag_type, details)
        values (p_user_id, 'rapid_voting', jsonb_build_object(
          'votes_last_10min', v_votes_last_10min,
          'poll_id', p_poll_id,
          'account_age_hours', round(v_account_age_hours, 1)
        ));
        update profiles set flag_count = coalesce(flag_count, 0) + 1, last_flag_at = now()
        where id = p_user_id;
      end if;
    end if;

    -- Flag: new account voting burst (under 24h old, 20+ votes in first hour)
    if v_account_age_hours < 24 and v_votes_last_hour >= 20 then
      v_existing_flag := null;
      select id into v_existing_flag from suspicious_flags
      where user_id = p_user_id and flag_type = 'new_account_burst'
        and not resolved and created_at > now() - interval '1 hour'
      limit 1;

      if v_existing_flag is null then
        insert into suspicious_flags (user_id, flag_type, details)
        values (p_user_id, 'new_account_burst', jsonb_build_object(
          'votes_last_hour', v_votes_last_hour,
          'account_age_hours', round(v_account_age_hours, 1)
        ));
        update profiles set flag_count = coalesce(flag_count, 0) + 1, last_flag_at = now()
        where id = p_user_id;
      end if;
    end if;
  end if;

  if p_action = 'poll_created' then
    select count(*) into v_polls_last_hour
    from polls
    where created_by = p_user_id
      and created_at > now() - interval '1 hour'
      and deleted_at is null;

    -- Flag: poll creation burst (3+ polls in an hour)
    if v_polls_last_hour >= 3 then
      select id into v_existing_flag from suspicious_flags
      where user_id = p_user_id and flag_type = 'poll_creation_burst'
        and not resolved and created_at > now() - interval '1 hour'
      limit 1;

      if v_existing_flag is null then
        insert into suspicious_flags (user_id, flag_type, details)
        values (p_user_id, 'poll_creation_burst', jsonb_build_object(
          'polls_last_hour', v_polls_last_hour,
          'account_age_hours', round(v_account_age_hours, 1)
        ));
        update profiles set flag_count = coalesce(flag_count, 0) + 1, last_flag_at = now()
        where id = p_user_id;
      end if;
    end if;
  end if;
end;
$$;
grant execute on function public.check_suspicious_behaviour(uuid, uuid, text) to authenticated;

-- ── RPC: detect_coordinated_voting ────────────────────────────
-- Looks for clusters of similar-age accounts voting within 60s of each
-- other on the same poll. Flags the poll when the cluster is large.
-- Callable from the admin dashboard (admin) or a service/cron job
-- (null auth.uid()); ordinary users are rejected.
create or replace function public.detect_coordinated_voting(p_poll_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_cluster_size integer;
begin
  if v_uid is not null and not exists (
    select 1 from profiles where id = v_uid and is_admin = true
  ) then
    raise exception 'not_authorized';
  end if;

  select count(*) into v_cluster_size
  from (
    select v1.user_id
    from votes v1
    join votes v2
      on v2.poll_id = v1.poll_id
     and v2.user_id <> v1.user_id
     and abs(extract(epoch from (v1.created_at - v2.created_at))) < 60
    join profiles p1 on p1.id = v1.user_id
    join profiles p2 on p2.id = v2.user_id
    where v1.poll_id = p_poll_id
      and abs(extract(epoch from (p1.created_at - p2.created_at))) < 86400
    group by v1.user_id
    having count(*) >= 3
  ) clustered;

  if v_cluster_size >= 5 then
    update polls set is_flagged = true where id = p_poll_id;

    insert into suspicious_flags (user_id, flag_type, details)
    select v.user_id, 'coordinated_voting', jsonb_build_object(
      'poll_id', p_poll_id, 'cluster_size', v_cluster_size
    )
    from (select distinct user_id from votes where poll_id = p_poll_id) v
    where not exists (
      select 1 from suspicious_flags sf
      where sf.user_id = v.user_id and sf.flag_type = 'coordinated_voting'
        and not sf.resolved
        and (sf.details->>'poll_id') = p_poll_id::text
    );

    return jsonb_build_object('suspicious', true, 'cluster_size', v_cluster_size, 'poll_id', p_poll_id);
  end if;

  return jsonb_build_object('suspicious', false, 'cluster_size', v_cluster_size);
end;
$$;
grant execute on function public.detect_coordinated_voting(uuid) to authenticated;

-- ── Admin RPCs for the flags dashboard ────────────────────────
create or replace function public.admin_get_flags()
returns table(
  id                 uuid,
  user_id            uuid,
  username           text,
  flag_type          text,
  details            jsonb,
  resolved           boolean,
  created_at         timestamptz,
  account_created_at timestamptz,
  user_flag_count    integer,
  is_suspended       boolean
)
language sql security definer set search_path = public
as $$
  select
    f.id, f.user_id, p.username, f.flag_type, f.details, f.resolved, f.created_at,
    p.created_at, coalesce(p.flag_count, 0), coalesce(p.is_suspended, false)
  from public.suspicious_flags f
  left join public.profiles p on p.id = f.user_id
  where exists (select 1 from profiles a where a.id = auth.uid() and a.is_admin = true)
  order by f.created_at desc
  limit 500;
$$;
grant execute on function public.admin_get_flags() to authenticated;

create or replace function public.admin_resolve_flag(p_flag_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update suspicious_flags
     set resolved = true, resolved_by = v_uid, resolved_at = now()
   where id = p_flag_id;
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_resolve_flag(uuid) to authenticated;

create or replace function public.admin_warn_user(p_user_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update profiles
     set admin_notes = concat_ws(E'\n',
           nullif(admin_notes, ''),
           to_char(now(), 'YYYY-MM-DD HH24:MI') || ' — ' || coalesce(nullif(btrim(p_note), ''), 'Warning issued'))
   where id = p_user_id;
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_warn_user(uuid, text) to authenticated;

create or replace function public.admin_clear_poll_flag(p_poll_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); begin
  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    raise exception 'not_authorized';
  end if;
  update polls set is_flagged = false where id = p_poll_id;
  return jsonb_build_object('success', true);
end; $$;
grant execute on function public.admin_clear_poll_flag(uuid) to authenticated;

-- ── cast_vote (v4 — account age stamp + behavioural check) ────
create or replace function public.cast_vote(
  p_poll_id   uuid,
  p_option_id uuid,
  p_comment   text default null,
  p_state     text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_state   text := nullif(btrim(p_state), '');
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_comment is not null and char_length(v_comment) > 280 then
    raise exception 'comment_too_long';
  end if;

  if (select count(*) from votes
        where user_id = v_uid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'hourly_vote_limit_reached';
  end if;

  insert into votes (poll_id, option_id, user_id, comment, state)
  values (p_poll_id, p_option_id, v_uid, v_comment, v_state);

  update poll_options set vote_count = vote_count + 1 where id = p_option_id;
  update polls         set total_votes = total_votes + 1 where id = p_poll_id;
  update profiles
     set points = points + 5,
         first_vote_at = coalesce(first_vote_at, now()),
         updated_at = now()
   where id = v_uid;

  insert into token_transactions (user_id, username, amount, reason, reason_type, poll_id)
  select v_uid, p.username, 5, 'Vote reward', 'vote', p_poll_id
  from profiles p where p.id = v_uid;

  perform public.check_suspicious_behaviour(v_uid, p_poll_id, 'vote');

  return jsonb_build_object('success', true);
exception
  when unique_violation then raise exception 'already_voted';
end;
$$;

-- ── create_poll (v4 — account age gate + dynamic daily limit) ─
create or replace function public.create_poll(
  p_question     text,
  p_category     text,
  p_options      text[],
  p_expires_at   timestamptz,
  p_is_hot_take  boolean default false,
  p_is_community boolean default false,
  p_community_name     text default null,
  p_community_code     text default null,
  p_community_password text default null,
  p_is_challenge   boolean default false,
  p_challenge_pool integer default 0
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid              uuid := auth.uid();
  v_poll_id          uuid;
  v_idx              int;
  v_is_challenge      boolean := coalesce(p_is_challenge, false);
  v_account_age_hours numeric;
  v_polls_today       integer;
  v_max_polls         integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if array_length(p_options, 1) < 2 then raise exception 'min_2_options'; end if;

  -- Account age gate — admins are exempt (they create challenges etc.).
  select extract(epoch from (now() - created_at)) / 3600
    into v_account_age_hours
  from profiles where id = v_uid;

  if not exists (select 1 from profiles where id = v_uid and is_admin = true) then
    if v_account_age_hours < 1 then
      raise exception 'account_too_new_to_create_polls';
    end if;

    -- Dynamic daily limit: under 7 days (168h) old → 2/day, otherwise 5/day.
    v_max_polls := case when v_account_age_hours < 168 then 2 else 5 end;

    select count(*) into v_polls_today
    from polls
    where created_by = v_uid
      and created_at > now() - interval '24 hours'
      and deleted_at is null;

    if v_polls_today >= v_max_polls then
      raise exception 'daily_poll_limit_reached';
    end if;
  end if;

  -- Only admins may create challenges.
  if v_is_challenge and not exists (
    select 1 from profiles where id = v_uid and is_admin = true
  ) then
    raise exception 'not_authorized';
  end if;

  insert into polls (question, category, created_by, expires_at, is_hot_take,
                     is_community, community_name, community_code, community_password,
                     is_challenge, challenge_pool, challenge_status)
  values (p_question, p_category, v_uid, p_expires_at, coalesce(p_is_hot_take, false),
          coalesce(p_is_community, false),
          nullif(btrim(p_community_name), ''),
          nullif(btrim(p_community_code), ''),
          nullif(btrim(p_community_password), ''),
          v_is_challenge,
          case when v_is_challenge then greatest(coalesce(p_challenge_pool, 0), 0) else 0 end,
          'active')
  returning id into v_poll_id;

  for v_idx in 1 .. array_length(p_options, 1) loop
    insert into poll_options (poll_id, text, display_order)
    values (v_poll_id, p_options[v_idx], v_idx);
  end loop;

  update profiles
     set points = points + 20,
         first_poll_at = coalesce(first_poll_at, now()),
         updated_at = now()
   where id = v_uid;

  insert into token_transactions (user_id, username, amount, reason, reason_type, poll_id)
  select v_uid, p.username, 20, 'Poll creation reward', 'poll_created', v_poll_id
  from profiles p where p.id = v_uid;

  perform public.check_suspicious_behaviour(v_uid, v_poll_id, 'poll_created');

  return v_poll_id;
end;
$$;

-- ── join_challenge (v3 — account age stamp + behavioural check) ─
create or replace function public.join_challenge(
  p_poll_id   uuid,
  p_option_id uuid,
  p_comment   text default null,
  p_state     text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
  v_state   text := nullif(btrim(p_state), '');
  v_poll    polls%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_poll from polls where id = p_poll_id;
  if not found then raise exception 'poll_not_found'; end if;
  if not v_poll.is_challenge then raise exception 'not_a_challenge'; end if;
  if coalesce(v_poll.challenge_status, 'active') <> 'active' then
    raise exception 'challenge_not_active';
  end if;
  if v_poll.expires_at <= now() then raise exception 'challenge_not_active'; end if;

  if v_comment is not null and char_length(v_comment) > 280 then
    raise exception 'comment_too_long';
  end if;

  if (select count(*) from votes
        where user_id = v_uid and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'hourly_vote_limit_reached';
  end if;

  insert into votes (poll_id, option_id, user_id, comment, state)
  values (p_poll_id, p_option_id, v_uid, v_comment, v_state);

  insert into challenge_participants (poll_id, user_id, option_id)
  values (p_poll_id, v_uid, p_option_id);

  update poll_options set vote_count = vote_count + 1 where id = p_option_id;
  update polls         set total_votes = total_votes + 1 where id = p_poll_id;
  update profiles
     set points = points + 7,
         first_vote_at = coalesce(first_vote_at, now()),
         updated_at = now()
   where id = v_uid;

  insert into token_transactions (user_id, username, amount, reason, reason_type, poll_id)
  select v_uid, p.username, 7, 'Challenge join reward', 'challenge', p_poll_id
  from profiles p where p.id = v_uid;

  perform public.check_suspicious_behaviour(v_uid, p_poll_id, 'vote');

  return jsonb_build_object('success', true);
exception
  when unique_violation then raise exception 'already_voted';
end;
$$;
grant execute on function public.join_challenge(uuid, uuid, text, text) to authenticated;

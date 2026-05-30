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
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.polls (
  id          uuid default gen_random_uuid() primary key,
  question    text not null,
  category    text not null,
  created_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null,
  total_votes integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint  polls_category_check check (
    category in ('Politics','Sports','Entertainment','Business','Lifestyle')
  )
);

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
  created_at timestamptz not null default now(),
  unique(poll_id, user_id)
);

-- For existing databases: add the optional comment column + length guard.
alter table public.votes add column if not exists comment text;
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

-- Poll options
create policy "options_read"   on public.poll_options for select using (true);
create policy "options_insert" on public.poll_options for insert with check (
  exists (select 1 from public.polls where id = poll_id and created_by = auth.uid())
);

-- Votes
create policy "votes_read"   on public.votes for select using (true);
create policy "votes_insert" on public.votes for insert with check (auth.uid() = user_id);

-- ── RPC: cast_vote ────────────────────────────────────────────
-- Atomically inserts a vote (with optional comment), increments
-- counts, awards 10 tokens.

-- Drop the old 2-arg signature so PostgREST resolves to the new one.
drop function if exists public.cast_vote(uuid, uuid);
drop function if exists public.cast_vote(uuid, uuid, text);

create or replace function public.cast_vote(
  p_poll_id   uuid,
  p_option_id uuid,
  p_comment   text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_comment text := nullif(btrim(p_comment), '');
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_comment is not null and char_length(v_comment) > 280 then
    raise exception 'comment_too_long';
  end if;

  insert into votes (poll_id, option_id, user_id, comment)
  values (p_poll_id, p_option_id, v_uid, v_comment);

  update poll_options set vote_count = vote_count + 1 where id = p_option_id;
  update polls         set total_votes = total_votes + 1 where id = p_poll_id;
  update profiles      set points = points + 10, updated_at = now() where id = v_uid;

  return jsonb_build_object('success', true);
exception
  when unique_violation then raise exception 'already_voted';
end;
$$;

-- ── RPC: create_poll ──────────────────────────────────────────
-- Atomically creates a poll + options, awards 30 tokens.

create or replace function public.create_poll(
  p_question  text,
  p_category  text,
  p_options   text[],
  p_expires_at timestamptz
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

  insert into polls (question, category, created_by, expires_at)
  values (p_question, p_category, v_uid, p_expires_at)
  returning id into v_poll_id;

  for v_idx in 1 .. array_length(p_options, 1) loop
    insert into poll_options (poll_id, text, display_order)
    values (v_poll_id, p_options[v_idx], v_idx);
  end loop;

  update profiles set points = points + 30, updated_at = now() where id = v_uid;

  return v_poll_id;
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

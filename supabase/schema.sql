-- Mail Games ELT Mission Control schema
-- Run in the Supabase SQL editor for a fresh project.

create extension if not exists pgcrypto;

create table if not exists public.question_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.question_packs(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 1000),
  type text not null check (type in ('multiple-choice', 'true-false', 'gap-fill')),
  options jsonb not null default '[]'::jsonb,
  answer text not null check (char_length(answer) between 1 and 500),
  explanation text not null default '',
  level text not null default 'B1',
  tag text not null default 'General English',
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  game_type text not null check (game_type in ('penalty', 'turkey', 'sniper')),
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'cancelled')),
  player_a_name text not null check (char_length(player_a_name) between 1 and 80),
  player_a_email text not null check (char_length(player_a_email) between 3 and 254),
  player_b_name text not null check (char_length(player_b_name) between 1 and 80),
  player_b_email text not null check (char_length(player_b_email) between 3 and 254),
  question_pack_id uuid not null references public.question_packs(id) on delete restrict,
  state jsonb not null,
  created_by uuid null references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_turns (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  actor text not null check (actor in ('A', 'B')),
  role text not null,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'expired', 'cancelled')),
  question_id uuid not null references public.questions(id) on delete restrict,
  question_snapshot jsonb not null,
  correct_answer text not null,
  submitted_answer text null,
  answer_correct boolean null,
  move text null,
  result_snapshot jsonb null,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  submitted_at timestamptz null,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed')),
  delivery_provider_id text null,
  delivery_error text null,
  delivery_recipient_masked text null,
  delivery_attempted_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists questions_pack_id_idx on public.questions(pack_id);
create index if not exists matches_status_idx on public.matches(status);
create index if not exists match_turns_match_id_idx on public.match_turns(match_id);
create index if not exists match_turns_delivery_status_idx on public.match_turns(delivery_status);
create unique index if not exists one_pending_turn_per_match_idx
  on public.match_turns(match_id)
  where status = 'pending';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

-- Browser clients must not read answer keys, emails, or match state directly.
alter table public.question_packs enable row level security;
alter table public.questions enable row level security;
alter table public.matches enable row level security;
alter table public.match_turns enable row level security;

-- No public policies are created in this milestone. Netlify Functions use the
-- server-only service-role key. Teacher-facing RLS policies arrive with auth.

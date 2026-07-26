-- Bagr — catch-up migration
-- Safe to run even if some pieces already exist (uses "if not exists" throughout)

create table if not exists profiles (
  user_id uuid references auth.users primary key,
  has_ab_weeks boolean not null default false,
  ab_reference_date date,
  ab_reference_week text check (ab_reference_week in ('A','B')),
  onboarded boolean not null default false
);
alter table profiles enable row level security;
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (auth.uid() = user_id);

create table if not exists bags (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  name text not null,
  color text not null default '#E8A33C'
);
alter table bags enable row level security;
drop policy if exists "own bags" on bags;
create policy "own bags" on bags for all using (auth.uid() = user_id);

alter table items add column if not exists bag_id bigint references bags(id) on delete set null;
alter table items add column if not exists missed_count int not null default 0;

alter table slots add column if not exists week text check (week in ('A','B'));

create table if not exists slot_skips (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  slot_id bigint references slots(id) on delete cascade not null,
  skip_date date not null,
  unique (slot_id, skip_date)
);
alter table slot_skips enable row level security;
drop policy if exists "own skips" on slot_skips;
create policy "own skips" on slot_skips for all using (auth.uid() = user_id);

alter table push_subscriptions add column if not exists notify_hour int not null default 19;

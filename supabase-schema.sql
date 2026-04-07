-- Run in Supabase: SQL Editor → New query → paste → Run.
-- Table for layouts submitted from the Brick site (Share button).

create table if not exists public.brick_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- layout: brick[] OR { "bricks", "source": { "compName", "perspName", "letterIndex"|"word"|"resultCount" }, "view3d"? }
  layout jsonb not null,
  canvas_w int not null,
  canvas_h int not null,
  brick_count int not null default 0,
  title text
);

create index if not exists brick_submissions_created_at_idx
  on public.brick_submissions (created_at desc);

alter table public.brick_submissions enable row level security;

-- Visitors may insert rows (browser uses anon / publishable JWT).
-- Use TO public so all client roles match (avoids RLS mismatch on newer projects).
drop policy if exists "brick_submissions_insert_anon" on public.brick_submissions;
drop policy if exists "brick_submissions_allow_insert" on public.brick_submissions;
create policy "brick_submissions_allow_insert"
  on public.brick_submissions
  for insert
  to public
  with check (true);

grant usage on schema public to anon, authenticated;
grant insert, select on table public.brick_submissions to anon, authenticated;

-- Public read for Library panel in the app (same anon key is already in the browser).
drop policy if exists "brick_submissions_select_public" on public.brick_submissions;
create policy "brick_submissions_select_public"
  on public.brick_submissions
  for select
  to public
  using (true);

comment on table public.brick_submissions is 'Brick layouts: Share inserts, Library lists (anon SELECT).';

-- Run once in Supabase → SQL Editor if Share fails with:
-- "new row violates row-level security policy for table brick_submissions"
--
-- Also: the app uses insert-only (no .select() after insert). Chaining .select()
-- requires a SELECT RLS policy for anon, which we intentionally omit.

-- Drop old policy name if present
drop policy if exists "brick_submissions_insert_anon" on public.brick_submissions;

-- Allow inserts from browser (anon JWT, authenticated, and any role via PUBLIC)
drop policy if exists "brick_submissions_allow_insert" on public.brick_submissions;
create policy "brick_submissions_allow_insert"
  on public.brick_submissions
  for insert
  to public
  with check (true);

-- Ensure table privileges (Supabase usually has these; safe to re-run)
grant usage on schema public to anon, authenticated;
grant insert on table public.brick_submissions to anon, authenticated;
grant select, update, delete on table public.brick_submissions to service_role;

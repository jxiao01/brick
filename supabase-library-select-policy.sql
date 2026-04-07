-- Run in Supabase SQL Editor so the website Library panel can list shared layouts (anon SELECT).
-- Safe for a public gallery: anyone with your anon/publishable key can read rows (same as the key in the frontend).

drop policy if exists "brick_submissions_select_public" on public.brick_submissions;

create policy "brick_submissions_select_public"
  on public.brick_submissions
  for select
  to public
  using (true);

grant select on table public.brick_submissions to anon, authenticated;

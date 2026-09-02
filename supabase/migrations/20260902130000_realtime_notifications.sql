-- Enables realtime notifications:
--   - Business owners get a popup when a new review comes in (reviews INSERT)
--   - Admins get a popup when a new business signs up (businesses INSERT)
-- Also adds owner_reply so the owner can write a personalized reply directly
-- from the notification popup, without leaving the dashboard.

alter table public.reviews
  add column if not exists owner_reply text,
  add column if not exists owner_replied_at timestamptz;

-- Add tables to the realtime publication if not already present (safe to
-- re-run; guards against "relation is already member of publication").
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'businesses'
  ) then
    alter publication supabase_realtime add table public.businesses;
  end if;
end $$;

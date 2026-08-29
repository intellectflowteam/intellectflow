-- Supports "auto-fetch nearby competitors" — needs the business's own
-- coordinates, and a place_id on competitors so repeated auto-fetches
-- don't create duplicate rows.

alter table public.businesses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.competitors
  add column if not exists place_id text;

-- Only one row per (business, google place) — lets auto-fetch safely
-- upsert without creating duplicates on repeated runs. Manually-added
-- competitors (no place_id) are unaffected.
create unique index if not exists competitors_business_place_uidx
  on public.competitors (business_id, place_id)
  where place_id is not null;

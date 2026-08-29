alter table public.businesses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.competitors
  add column if not exists place_id text;

create unique index if not exists competitors_business_place_uidx
  on public.competitors (business_id, place_id)
  where place_id is not null;
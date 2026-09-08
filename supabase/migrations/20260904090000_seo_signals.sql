-- Real signals for the SEO Health score/checklist — populated from Google
-- Places Details during onboarding and the weekly auto-refresh pipeline.
-- Replaces heuristic/placeholder checks with actual profile data.

alter table public.businesses
  add column if not exists has_hours boolean,
  add column if not exists photo_count integer,
  add column if not exists gmb_categories text;

-- Keep businesses_public view in sync so the public review page and other
-- anon-readable contexts still see a consistent column set.
drop view if exists public.businesses_public;
create view public.businesses_public as
  select id, name, slug, gmb_link, place_id, rating, total_reviews, city, address,
         description, business_type, photo_url, target_keywords, preferred_language,
         has_hours, photo_count, gmb_categories
  from public.businesses;

grant select on public.businesses_public to anon, authenticated;
grant all on public.businesses_public to service_role;

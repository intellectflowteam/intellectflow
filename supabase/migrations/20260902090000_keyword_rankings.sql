-- Weekly keyword rank tracking: for each business's target_keywords, stores
-- where the business itself ranks in Google Places Text Search results for
-- that keyword, where its tracked competitors rank, and who the overall top
-- results were at that point in time. Populated by the weekly cron at
-- /api/public/keyword-rank-check.

create table if not exists public.keyword_rankings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  keyword text not null,
  -- 1-indexed position of this business's place_id in the search results,
  -- or null if it did not appear in the checked results (top 20).
  own_position int,
  -- [{ competitor_id, name, position }] for this business's tracked competitors
  -- (position is null if that competitor did not appear in results either).
  competitor_positions jsonb not null default '[]'::jsonb,
  -- [{ name, rating, position }] the overall top results for this keyword,
  -- regardless of whether they're a tracked competitor.
  top_results jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists keyword_rankings_business_keyword_idx
  on public.keyword_rankings (business_id, keyword, checked_at desc);

alter table public.keyword_rankings enable row level security;

drop policy if exists "Owners view own keyword rankings" on public.keyword_rankings;
create policy "Owners view own keyword rankings"
  on public.keyword_rankings for select
  using (
    exists (select 1 from public.businesses b where b.id = keyword_rankings.business_id and b.user_id = auth.uid())
  );

drop policy if exists "Admins manage all keyword rankings" on public.keyword_rankings;
create policy "Admins manage all keyword rankings"
  on public.keyword_rankings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select on public.keyword_rankings to authenticated;
grant all on public.keyword_rankings to service_role;

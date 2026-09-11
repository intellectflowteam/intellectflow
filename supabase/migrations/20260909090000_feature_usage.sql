-- Tracks usage of plan-gated features that don't already have a natural
-- countable table of their own (e.g. AI Reply generations aren't saved
-- anywhere else). Features that DO already persist real rows — GMB posts,
-- FAQs, tracked competitors — are counted directly from those tables
-- instead of duplicated here.

create table if not exists public.feature_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  feature text not null,
  created_at timestamptz not null default now()
);

create index if not exists feature_usage_business_feature_idx
  on public.feature_usage (business_id, feature, created_at desc);

alter table public.feature_usage enable row level security;

drop policy if exists "Owners read own feature usage" on public.feature_usage;
create policy "Owners read own feature usage"
  on public.feature_usage for select
  using (exists (select 1 from public.businesses b where b.id = feature_usage.business_id and b.user_id = auth.uid()));

drop policy if exists "Owners log own feature usage" on public.feature_usage;
create policy "Owners log own feature usage"
  on public.feature_usage for insert
  with check (exists (select 1 from public.businesses b where b.id = feature_usage.business_id and b.user_id = auth.uid()));

grant select, insert on public.feature_usage to authenticated;
grant all on public.feature_usage to service_role;

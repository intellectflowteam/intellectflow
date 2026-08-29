create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  question text not null,
  answer text not null,
  source text default 'ai' check (source in ('ai','manual')),
  published boolean default true,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.faqs to authenticated;
grant all on public.faqs to service_role;
alter table public.faqs enable row level security;
drop policy if exists "Owners manage faqs" on public.faqs;
create policy "Owners manage faqs" on public.faqs for all to authenticated using (
  exists (select 1 from public.businesses b where b.id = faqs.business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = faqs.business_id and b.user_id = auth.uid())
);
drop policy if exists "Admins manage all faqs" on public.faqs;
create policy "Admins manage all faqs" on public.faqs for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  type text not null check (type in ('rating_drop','negative_review','other')),
  severity text default 'warning' check (severity in ('info','warning','critical')),
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);
grant select, update, delete on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;
drop policy if exists "Owners manage alerts" on public.alerts;
create policy "Owners manage alerts" on public.alerts for all to authenticated using (
  exists (select 1 from public.businesses b where b.id = alerts.business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = alerts.business_id and b.user_id = auth.uid())
);
drop policy if exists "Admins manage all alerts" on public.alerts;
create policy "Admins manage all alerts" on public.alerts for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create index if not exists alerts_business_unread_idx on public.alerts (business_id, is_read, created_at desc);

alter table public.reviews add column if not exists ai_reply_suggestion jsonb;
alter table public.businesses add column if not exists swot_summary jsonb, add column if not exists swot_generated_at timestamptz;
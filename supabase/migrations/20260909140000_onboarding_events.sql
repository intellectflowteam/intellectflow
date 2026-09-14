-- Tracks which onboarding step each user reaches, so admins can see a real
-- drop-off funnel instead of guessing where people abandon signup.

create table if not exists public.onboarding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  step integer not null,
  created_at timestamptz not null default now()
);

create index if not exists onboarding_events_user_step_idx on public.onboarding_events (user_id, step);

alter table public.onboarding_events enable row level security;

drop policy if exists "Users log own onboarding events" on public.onboarding_events;
create policy "Users log own onboarding events"
  on public.onboarding_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins read onboarding events" on public.onboarding_events;
create policy "Admins read onboarding events"
  on public.onboarding_events for select to authenticated
  using (public.is_admin(auth.uid()));

grant insert on public.onboarding_events to authenticated;
grant all on public.onboarding_events to service_role;

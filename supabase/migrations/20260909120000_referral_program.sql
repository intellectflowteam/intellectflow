-- Referral program: every account gets a unique referral code (generated
-- lazily on first use). referred_by tracks which existing user's code was
-- used at signup. Rewards are granted manually via the existing admin
-- "grant free access" tool once a referred business completes onboarding -
-- deliberately not wired into automated billing credits yet, to avoid
-- introducing untested logic into the payment path.

alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists referral_reward_granted boolean not null default false;

create index if not exists profiles_referred_by_idx on public.profiles (referred_by);

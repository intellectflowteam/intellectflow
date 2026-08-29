-- OTP CODES TABLE FOR BREVO EMAIL VERIFICATION
create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  purpose text default 'signup',
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.otp_codes to service_role;
grant select, insert on public.otp_codes to anon, authenticated;
alter table public.otp_codes enable row level security;

create policy "Allow insert OTP" on public.otp_codes for insert with check (true);
create policy "Allow select OTP" on public.otp_codes for select using (true);

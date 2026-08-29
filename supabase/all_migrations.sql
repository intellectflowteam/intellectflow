
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  business_name text,
  phone text,
  city text default 'Visavadar',
  plan text default 'starter' check (plan in ('starter','growth','pro')),
  plan_price int default 299,
  is_founder_free boolean default false,
  is_admin boolean default false,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- BUSINESSES
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  business_type text default 'shop',
  gmb_link text,
  qr_url text,
  address text,
  city text default 'Visavadar',
  rating numeric default 4.8,
  total_reviews int default 0,
  total_scans int default 0,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.businesses to authenticated;
grant select on public.businesses to anon;
grant all on public.businesses to service_role;
alter table public.businesses enable row level security;
create policy "Public read businesses by slug" on public.businesses for select using (true);
create policy "Owners manage businesses" on public.businesses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  customer_name text,
  customer_phone text,
  rating int check (rating between 1 and 5) not null,
  review_text text,
  ai_generated boolean default false,
  status text default 'pending' check (status in ('pending','private','public','replied')),
  sentiment text,
  source text default 'qr' check (source in ('qr','gmb','direct')),
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.reviews to authenticated;
grant insert on public.reviews to anon;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "Anon can submit reviews" on public.reviews for insert with check (true);
create policy "Owners read reviews" on public.reviews for select using (
  exists (select 1 from public.businesses b where b.id = reviews.business_id and b.user_id = auth.uid())
);
create policy "Owners update reviews" on public.reviews for update using (
  exists (select 1 from public.businesses b where b.id = reviews.business_id and b.user_id = auth.uid())
);
create policy "Owners delete reviews" on public.reviews for delete using (
  exists (select 1 from public.businesses b where b.id = reviews.business_id and b.user_id = auth.uid())
);

-- COUPONS
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  code text not null,
  discount text default '10% OFF',
  valid_till date default (now() + interval '30 days'),
  used_count int default 0,
  max_usage int default 100,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.coupons to authenticated;
grant select on public.coupons to anon;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "Public read coupons" on public.coupons for select using (true);
create policy "Owners manage coupons" on public.coupons for all using (
  exists (select 1 from public.businesses b where b.id = coupons.business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = coupons.business_id and b.user_id = auth.uid())
);

-- GMB POSTS
create table public.gmb_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  content text not null,
  image_url text,
  status text default 'draft' check (status in ('draft','scheduled','published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.gmb_posts to authenticated;
grant all on public.gmb_posts to service_role;
alter table public.gmb_posts enable row level security;
create policy "Owners manage gmb_posts" on public.gmb_posts for all using (
  exists (select 1 from public.businesses b where b.id = gmb_posts.business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = gmb_posts.business_id and b.user_id = auth.uid())
);

-- WHATSAPP LOGS
create table public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  phone text not null,
  message_type text check (message_type in ('reminder_24hr','thankyou_coupon','negative_private','review_request')),
  message_text text,
  status text default 'pending' check (status in ('pending','sent','failed','delivered')),
  sent_at timestamptz default now()
);
grant select, insert, update, delete on public.whatsapp_logs to authenticated;
grant insert on public.whatsapp_logs to anon;
grant all on public.whatsapp_logs to service_role;
alter table public.whatsapp_logs enable row level security;
create policy "Anon insert whatsapp logs" on public.whatsapp_logs for insert with check (true);
create policy "Owners read whatsapp" on public.whatsapp_logs for select using (
  exists (select 1 from public.businesses b where b.id = whatsapp_logs.business_id and b.user_id = auth.uid())
);
create policy "Owners update whatsapp" on public.whatsapp_logs for update using (
  exists (select 1 from public.businesses b where b.id = whatsapp_logs.business_id and b.user_id = auth.uid())
);

-- COMPETITORS
create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  competitor_name text not null,
  competitor_address text,
  competitor_rating numeric,
  competitor_reviews int,
  last_checked timestamptz default now(),
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.competitors to authenticated;
grant all on public.competitors to service_role;
alter table public.competitors enable row level security;
create policy "Owners manage competitors" on public.competitors for all using (
  exists (select 1 from public.businesses b where b.id = competitors.business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = competitors.business_id and b.user_id = auth.uid())
);

-- STANDEES
create table public.standees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  type text check (type in ('poster','standee','table_stand')) not null,
  design_url text,
  qr_data text,
  status text default 'pending' check (status in ('pending','designed','delivered')),
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.standees to authenticated;
grant all on public.standees to service_role;
alter table public.standees enable row level security;
create policy "Owners manage standees" on public.standees for all using (
  exists (select 1 from public.businesses b where b.id = standees.business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = standees.business_id and b.user_id = auth.uid())
);

-- SUBSCRIPTIONS
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan text check (plan in ('starter','growth','pro')) not null,
  price int not null,
  market_value text,
  status text default 'active' check (status in ('active','cancelled','past_due')),
  current_period_start timestamptz default now(),
  current_period_end timestamptz default (now() + interval '30 days'),
  is_lifetime boolean default false,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Users own subscriptions" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Increment scan counter (public)
create or replace function public.increment_scan(_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.businesses set total_scans = total_scans + 1 where slug = _slug;
$$;
grant execute on function public.increment_scan(text) to anon, authenticated;

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_founder_free, is_admin)
  values (
    new.id,
    new.email,
    new.email = 'intellectflowteam@gmail.com',
    new.email = 'intellectflowteam@gmail.com'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 1) Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.increment_scan(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) Remove overly permissive anon INSERT policies (moving inserts to server route with admin client)
DROP POLICY IF EXISTS "Anon can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anon insert whatsapp logs" ON public.whatsapp_logs;

REVOKE INSERT, UPDATE, DELETE ON public.reviews FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.coupons FROM anon;

-- 3) Drop broad public coupon read
DROP POLICY IF EXISTS "Public read coupons" ON public.coupons;
REVOKE SELECT ON public.coupons FROM anon;

-- 4) Restrict public columns exposed from businesses via column-level grants
REVOKE SELECT ON public.businesses FROM anon;
GRANT SELECT (id, name, slug, gmb_link, rating, total_reviews, city, address) ON public.businesses TO anon;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS website text;

GRANT SELECT (id, name, slug, gmb_link, rating, total_reviews, city, address, phone, photo_url, website, description, business_type) ON public.businesses TO anon;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  admin_emails text[] := array['intellectflowteam@gmail.com','kaushiksavaliya909@gmail.com'];
begin
  insert into public.profiles (id, email, is_founder_free, is_admin)
  values (
    new.id,
    new.email,
    new.email = any(admin_emails),
    new.email = any(admin_emails)
  )
  on conflict (id) do update set
    is_admin = excluded.is_admin or public.profiles.is_admin,
    is_founder_free = excluded.is_founder_free or public.profiles.is_founder_free;
  return new;
end;
$function$;

UPDATE public.profiles SET is_admin = true, is_founder_free = true
WHERE email IN ('intellectflowteam@gmail.com','kaushiksavaliya909@gmail.com');

-- 1) Restrict public businesses read via a curated security_invoker view
DROP POLICY IF EXISTS "Public read businesses by slug" ON public.businesses;

CREATE OR REPLACE VIEW public.businesses_public
WITH (security_invoker = on) AS
  SELECT id, name, slug, gmb_link, rating, total_reviews, city, address,
         description, business_type, photo_url
  FROM public.businesses;

GRANT SELECT ON public.businesses_public TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='businesses' AND policyname='Owners read own business'
  ) THEN
    CREATE POLICY "Owners read own business" ON public.businesses
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

REVOKE SELECT ON public.businesses FROM anon;

DROP POLICY IF EXISTS "Owners can insert own reviews" ON public.reviews;
CREATE POLICY "Owners can insert own reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can insert own whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Owners can insert own whatsapp logs" ON public.whatsapp_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = _uid), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage all standees" ON public.standees;
CREATE POLICY "Admins manage all standees" ON public.standees FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all businesses" ON public.businesses;
CREATE POLICY "Admins read all businesses" ON public.businesses FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins read all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','businesses','reviews','coupons','gmb_posts','whatsapp_logs','competitors','standees','subscriptions']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', tbl);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', tbl);
  END LOOP;
END
$$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin'::public.app_role)
$$;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE lower(email) = lower('kaushiksavaliya909@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET is_admin = true, is_founder_free = true, plan_price = 0
WHERE lower(email) = lower('kaushiksavaliya909@gmail.com');

DROP POLICY IF EXISTS "Admins read all reviews" ON public.reviews;
CREATE POLICY "Admins read all reviews"
ON public.reviews FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public reads safe businesses" ON public.businesses;
CREATE POLICY "Public reads safe businesses"
ON public.businesses FOR SELECT TO anon
USING (true);

REVOKE ALL ON TABLE public.businesses FROM anon;
GRANT SELECT (id, name, slug, gmb_link, rating, total_reviews, city, address, description, business_type, photo_url) ON TABLE public.businesses TO anon;
GRANT SELECT ON TABLE public.businesses_public TO anon, authenticated;
GRANT ALL ON TABLE public.businesses_public TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin'::public.app_role)
$$;

DROP POLICY IF EXISTS "Admins manage all reviews" ON public.reviews;
CREATE POLICY "Admins manage all reviews"
ON public.reviews FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage all coupons" ON public.coupons;
CREATE POLICY "Admins manage all coupons"
ON public.coupons FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage all posts" ON public.gmb_posts;
CREATE POLICY "Admins manage all posts"
ON public.gmb_posts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage all whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Admins manage all whatsapp logs"
ON public.whatsapp_logs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage all competitors" ON public.competitors;
CREATE POLICY "Admins manage all competitors"
ON public.competitors FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lifetime_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS razorpay_plan_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_ref text;

UPDATE public.profiles SET lifetime_free = true WHERE is_founder_free = true;
UPDATE public.profiles SET trial_ends_at = COALESCE(trial_ends_at, created_at + interval '3 days');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  admin_emails text[] := array['intellectflowteam@gmail.com','kaushiksavaliya909@gmail.com'];
begin
  insert into public.profiles (id, email, is_founder_free, is_admin, lifetime_free, trial_ends_at, subscription_status)
  values (
    new.id,
    new.email,
    new.email = any(admin_emails),
    new.email = any(admin_emails),
    new.email = any(admin_emails),
    now() + interval '3 days',
    case when new.email = any(admin_emails) then 'lifetime' else 'trialing' end
  )
  on conflict (id) do update set
    is_admin = excluded.is_admin or public.profiles.is_admin,
    is_founder_free = excluded.is_founder_free or public.profiles.is_founder_free,
    lifetime_free = excluded.lifetime_free or public.profiles.lifetime_free;

  if new.email = any(admin_emails) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$function$;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role FROM auth.users u
WHERE lower(u.email) = 'kaushiksavaliya909@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles p SET is_admin = true, lifetime_free = true, is_founder_free = true, subscription_status = 'lifetime'
WHERE lower(p.email) = 'kaushiksavaliya909@gmail.com';

DROP POLICY IF EXISTS "Admins read all reviews" ON public.reviews;
CREATE POLICY "Admins read all reviews" ON public.reviews FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Public reads safe businesses" ON public.businesses;
REVOKE SELECT ON public.businesses FROM anon;
ALTER VIEW public.businesses_public SET (security_invoker = off);
GRANT SELECT ON public.businesses_public TO anon, authenticated;
ALTER VIEW public.businesses_public SET (security_invoker = on);
CREATE POLICY "Public reads safe businesses" ON public.businesses FOR SELECT TO anon USING (true);
GRANT SELECT (id, name, slug, gmb_link, rating, total_reviews, city, address, description, business_type, photo_url) ON public.businesses TO anon;
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
DROP POLICY IF EXISTS "Public reads safe businesses" ON public.businesses;
REVOKE SELECT ON public.businesses FROM anon;
ALTER VIEW public.businesses_public SET (security_invoker = off);
GRANT SELECT ON public.businesses_public TO anon, authenticated;
ALTER VIEW public.businesses_public SET (security_invoker = on);
CREATE POLICY "Public reads safe businesses" ON public.businesses FOR SELECT TO anon USING (true);
GRANT SELECT (id, name, slug, gmb_link, rating, total_reviews, city, address, description, business_type, photo_url) ON public.businesses TO anon;
alter table public.businesses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.competitors
  add column if not exists place_id text;

create unique index if not exists competitors_business_place_uidx
  on public.competitors (business_id, place_id)
  where place_id is not null;
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

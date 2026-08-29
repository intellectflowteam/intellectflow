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

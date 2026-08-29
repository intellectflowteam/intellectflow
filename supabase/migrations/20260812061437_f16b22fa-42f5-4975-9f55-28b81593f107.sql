DROP POLICY IF EXISTS "Public reads safe businesses" ON public.businesses;
REVOKE SELECT ON public.businesses FROM anon;
ALTER VIEW public.businesses_public SET (security_invoker = off);
GRANT SELECT ON public.businesses_public TO anon, authenticated;
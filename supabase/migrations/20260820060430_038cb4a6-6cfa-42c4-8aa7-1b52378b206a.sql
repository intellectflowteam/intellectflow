ALTER VIEW public.businesses_public SET (security_invoker = on);
CREATE POLICY "Public reads safe businesses" ON public.businesses FOR SELECT TO anon USING (true);
GRANT SELECT (id, name, slug, gmb_link, rating, total_reviews, city, address, description, business_type, photo_url) ON public.businesses TO anon;
-- Migration: Add target_keywords and preferred_language to businesses table and businesses_public view

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS target_keywords text,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'English';

DROP VIEW IF EXISTS public.businesses_public;

CREATE VIEW public.businesses_public AS
  SELECT id, name, slug, gmb_link, rating, total_reviews, city, address,
         description, business_type, photo_url, target_keywords, preferred_language
  FROM public.businesses;

GRANT SELECT ON public.businesses_public TO anon, authenticated;
GRANT ALL ON public.businesses_public TO service_role;

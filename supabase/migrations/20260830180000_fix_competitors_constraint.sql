-- Fix competitors unique constraint so PostgREST onConflict works reliably
DROP INDEX IF EXISTS public.competitors_business_place_uidx;

ALTER TABLE public.competitors
  DROP CONSTRAINT IF EXISTS competitors_business_place_key;

ALTER TABLE public.competitors
  ADD CONSTRAINT competitors_business_place_key UNIQUE (business_id, place_id);

alter table public.alerts
  drop constraint if exists alerts_type_check;

alter table public.alerts
  add constraint alerts_type_check
  check (type in ('rating_drop','negative_review','other','hyperlocal_opportunity','nap_mismatch'));

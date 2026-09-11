-- Adds 'broadcast' as a valid message_type so the new WhatsApp Broadcast
-- Pack composer (plan-gated: 0 / 5 / 20 per month) can queue messages.

alter table public.whatsapp_logs
  drop constraint if exists whatsapp_logs_message_type_check;

alter table public.whatsapp_logs
  add constraint whatsapp_logs_message_type_check
  check (message_type in ('reminder_24hr','thankyou_coupon','negative_private','review_request','broadcast'));

-- 'queued' status for a broadcast message that's been created but not yet
-- actually delivered (real delivery requires connecting a WhatsApp Business
-- API/provider, which is a separate, larger integration).
alter table public.whatsapp_logs
  drop constraint if exists whatsapp_logs_status_check;

alter table public.whatsapp_logs
  add constraint whatsapp_logs_status_check
  check (status in ('pending','sent','failed','delivered','queued'));

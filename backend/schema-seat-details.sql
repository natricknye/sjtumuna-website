-- Seat result detail fields used by delegates_api (login/seat).
-- Additive migration: existing records are preserved.

alter table public.delegates
  add column if not exists school text,
  add column if not exists payment_status text,
  add column if not exists seat_role text;

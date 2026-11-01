-- Minimal, data-preserving expansion of the existing delegates table.
-- Each pre-generated delegate_no is an unclaimed code until a delegate binds
-- their name to it. This prepares the later Cloud Function workflow; it does
-- not change the current site's permissions.

begin;

-- A generated code starts without a name or venue preference.
alter table public.delegates
  alter column name drop not null,
  alter column venue_preference drop not null;

-- The submitted answers and seat choices are JSON so each of the five venues
-- can use its own question/seat structure without creating more tables.
alter table public.delegates
  add column if not exists exam_answers jsonb,
  add column if not exists seat_preferences jsonb,
  add column if not exists exam_submitted_at timestamptz,
  add column if not exists score numeric(6, 2),
  add column if not exists assigned_seat text,
  add column if not exists result_published boolean not null default false;

commit;

-- Later, after the Cloud Function replaces direct browser-to-table writes,
-- remove the temporary anonymous INSERT policy/grant from schema.sql. Do not
-- import the official roster until that function is ready, or the current
-- registration form could create duplicate/unverified rows.

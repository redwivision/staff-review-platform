-- Proves the table-level CHECK rejects self-coaching on its own merit, with the
-- trigger DISABLED so the trigger cannot be what is doing the rejecting.
--
-- Each case runs inside a subtransaction so one failure does not abort the rest,
-- and every case is asserted rather than left for a human to eyeball. Exits
-- non-zero if any case behaves unexpectedly.
\set ON_ERROR_STOP off
\pset pager off
\timing off

create or replace function pg_temp.expect_violation(
  label text, stmt text, should_fail boolean
) returns void language plpgsql as $$
declare
  got_error boolean;
begin
  begin
    execute stmt;
    got_error := false;
  exception when others then
    got_error := true;
  end;

  if should_fail and not got_error then
    raise exception 'FAIL [%]: statement succeeded but a violation was expected', label;
  elsif not should_fail and got_error then
    raise exception 'FAIL [%]: statement was rejected but should have been allowed', label;
  end if;

  raise notice 'PASS [%]', label;
end $$;

-- Seeded here so the file can be run on its own against a freshly applied
-- schema, without depending on self-assignment-check.sql having run first.
insert into public.users (uid, email, name, is_admin, is_leader, role)
values
  ('admin1', 'admin@example.com', 'Admin One',  true,  false, 'Admin'),
  ('coach1', 'coach@example.com', 'Coach One',  false, false, 'Staff'),
  ('staff1', 'staff@example.com', 'Staff One',  false, false, 'Staff')
on conflict (uid) do nothing;

begin;
alter table public.users disable trigger trg_sync_assigned_coach;

select pg_temp.expect_violation(
  'UPDATE coach_uid = own uid is rejected',
  $$update public.users set coach_uid = 'staff1' where uid = 'staff1'$$,
  true);

select pg_temp.expect_violation(
  'INSERT with coach_uid = own uid is rejected',
  $$insert into public.users (uid, email, name, coach_uid)
    values ('staff9', 's9@example.com', 'Staff Nine', 'staff9')$$,
  true);

select pg_temp.expect_violation(
  'UPDATE that computes coach_uid = own uid is rejected',
  $$update public.users
      set coach_uid = case when uid = 'coach1' then 'coach1' else coach_uid end
    where uid = 'coach1'$$,
  true);

select pg_temp.expect_violation(
  'legal assignment (coach_uid <> uid) is allowed',
  $$update public.users set coach_uid = 'coach1' where uid = 'admin1'$$,
  false);

select pg_temp.expect_violation(
  'clearing a coach is allowed',
  $$update public.users set coach_uid = null where uid = 'admin1'$$,
  false);

rollback;

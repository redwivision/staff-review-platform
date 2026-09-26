-- Verifies the self-assignment invariant holds in three layers:
--   1. the table-level CHECK exists and is validated,
--   2. it rejects self-coaching even with the trigger DISABLED (defence in
--      depth for writers that never fire the trigger),
--   3. the trigger still promotes a legitimately assigned coach to leader and
--      clears a null coach_uid.
\set ON_ERROR_STOP on
\pset pager off

\echo '=== 1. constraint present ==='
select conname, pg_get_constraintdef(oid) as definition, convalidated
from pg_constraint
where conrelid = 'public.users'::regclass and conname = 'users_coach_not_self';

\echo ''
\echo '=== seed users ==='
insert into public.users (uid, email, name, is_admin, is_leader, role)
values
  ('admin1', 'admin@example.com', 'Admin One',  true,  false, 'Admin'),
  ('coach1', 'coach@example.com', 'Coach One',  false, false, 'Staff'),
  ('staff1', 'staff@example.com', 'Staff One',  false, false, 'Staff')
on conflict (uid) do nothing;

\echo ''
\echo '=== 2. self-assignment rejected with trigger DISABLED ==='
begin;
alter table public.users disable trigger trg_sync_assigned_coach;
\echo '-- direct write coach_uid = own uid (trigger off):'
do $$
begin
  update public.users set coach_uid = uid where uid = 'staff1';
  raise exception 'FAIL: CHECK let a self-assignment through';
exception
  when check_violation then raise notice 'PASS: blocked by CHECK (check_violation)';
end $$;
\echo '-- raw insert with coach_uid = own uid (trigger off):'
do $$
begin
  insert into public.users (uid, email, name, coach_uid)
  values ('staff2', 's2@example.com', 'Staff Two', 'staff2');
  raise exception 'FAIL: CHECK let a self-assigning row in';
exception
  when check_violation then raise notice 'PASS: insert blocked by CHECK';
end $$;
rollback;

\echo ''
\echo '=== 3. trigger behaviour still correct (trigger ON) ==='
\echo '-- admin assigns coach1 to staff1:'
update public.users set coach_uid = 'coach1' where uid = 'staff1';
select uid, coach_uid, is_leader, role from public.users where uid in ('coach1','staff1') order by uid;

\echo '-- admin clears the assignment (coach keeps leader, is not demoted):'
update public.users set coach_uid = null where uid = 'staff1';
select uid, coach_uid, is_leader from public.users where uid = 'coach1';

\echo ''
\echo '=== 4. reassignment to a different coach ==='
update public.users set coach_uid = 'staff1' where uid = 'admin1';
select uid, coach_uid, is_leader from public.users order by uid;

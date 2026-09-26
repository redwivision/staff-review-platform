-- Stand-ins for the Supabase-managed roles and `auth` schema, so
-- supabase-schema.sql can be exercised on a plain local PostgreSQL instance.
--
-- Roles are cluster-wide rather than per-database, so creating them has to be
-- idempotent or a second test run fails. Wrap each in its own DO block with an
-- existence check.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

create schema if not exists auth;

-- `current_setting` lets a test impersonate any uid without editing the schema.
create or replace function auth.uid() returns text
  language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '');
$$;

create or replace function auth.jwt() returns jsonb
  language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

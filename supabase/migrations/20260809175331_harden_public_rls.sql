begin;

-- Audit result:
-- - LMS profile/course/enrollment tables already have role- and ownership-based
--   policies, but the current Next.js application accesses all except the caller's
--   own lms_users profile through Prisma.
-- - ERP, payment, health, parent, material, telemetry, and legacy content tables
--   are accessed by Prisma or the server-only Supabase service-role client.
-- - The optional legacy snippets/focus tables have their own ownership policies.
--
-- Enable RLS defensively on every current public table. Do not FORCE RLS: Prisma
-- connects as the database owner and the Supabase service role must retain the
-- server-side access paths used by the application.
do $migration$
declare
  public_table record;
  has_anon_role boolean := exists (
    select 1 from pg_roles where rolname = 'anon'
  );
  has_authenticated_role boolean := exists (
    select 1 from pg_roles where rolname = 'authenticated'
  );
begin
  for public_table in
    select namespace.nspname as schema_name, relation.relname as table_name
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
  loop
    execute format(
      'alter table %I.%I enable row level security',
      public_table.schema_name,
      public_table.table_name
    );

    -- No application table is intentionally anonymous. Supabase Auth itself is
    -- in the auth schema and is not affected by these table privilege revokes.
    execute format(
      'revoke all privileges on table %I.%I from public',
      public_table.schema_name,
      public_table.table_name
    );

    if has_anon_role then
      execute format(
        'revoke all privileges on table %I.%I from anon',
        public_table.schema_name,
        public_table.table_name
      );
    end if;

    -- Reset legacy/default grants before restoring only the direct-client access
    -- that the checked-in application actually uses. In particular, TRUNCATE is
    -- not governed by RLS and must never remain granted to a web client role.
    if has_authenticated_role then
      execute format(
        'revoke all privileges on table %I.%I from authenticated',
        public_table.schema_name,
        public_table.table_name
      );
    end if;
  end loop;

  -- src/proxy.ts reads the authenticated caller's lms_users profile. Its
  -- existing "users read own profile" policy supplies the row predicate.
  if has_authenticated_role and to_regclass('public.lms_users') is not null then
    execute 'drop policy if exists "users update own display name" on public.lms_users';
    execute 'grant select on table public.lms_users to authenticated';
  end if;

  -- Keep the optional legacy Forge feed readable if that separately maintained
  -- table is installed. Inserts go through the authenticated server API.
  if has_authenticated_role and to_regclass('public.snippets') is not null then
    execute 'grant select on table public.snippets to authenticated';
  end if;

  -- Prisma migrations run as the current database role. Prevent future
  -- app-owned tables, sequences, and functions from inheriting Supabase's broad
  -- legacy web-role defaults. Service-role defaults remain unchanged.
  execute 'alter default privileges in schema public revoke all privileges on tables from public';
  execute 'alter default privileges in schema public revoke all privileges on sequences from public';
  execute 'alter default privileges in schema public revoke execute on functions from public';
  if has_anon_role then
    execute 'alter default privileges in schema public revoke all privileges on tables from anon';
    execute 'alter default privileges in schema public revoke all privileges on sequences from anon';
    execute 'alter default privileges in schema public revoke execute on functions from anon';
  end if;
  if has_authenticated_role then
    execute 'alter default privileges in schema public revoke all privileges on tables from authenticated';
    execute 'alter default privileges in schema public revoke all privileges on sequences from authenticated';
    execute 'alter default privileges in schema public revoke execute on functions from authenticated';
  end if;
end
$migration$;

-- Fail the migration instead of silently leaving an exposed table behind.
do $verification$
begin
  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and not relation.relrowsecurity
  ) then
    raise exception 'RLS hardening failed: at least one public table has RLS disabled.';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('PUBLIC', 'anon')
  ) then
    raise exception 'RLS hardening failed: anonymous public-table privileges remain.';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and not (
        privilege_type = 'SELECT'
        and table_name in ('lms_users', 'snippets')
      )
  ) then
    raise exception 'RLS hardening failed: excessive authenticated table privileges remain.';
  end if;
end
$verification$;

commit;

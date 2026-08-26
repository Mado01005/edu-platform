-- Replace the legacy partial unique index with the full PostgreSQL unique
-- constraint represented by Prisma. Both allow multiple NULL values, so the
-- effective token rule is unchanged. The transaction aborts before changing
-- the index if any duplicate non-null token is present.
do $$
begin
  if exists (
    select 1
    from public.lms_users
    where active_session_token is not null
    group by active_session_token
    having count(*) > 1
  ) then
    raise exception 'Cannot align active-session uniqueness: duplicate tokens exist';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.lms_users'::regclass
      and conname = 'lms_users_active_session_token_key'
  ) then
    drop index if exists public.lms_users_active_session_token_key;
    alter table public.lms_users
      add constraint lms_users_active_session_token_key
      unique (active_session_token);
  end if;
end
$$;

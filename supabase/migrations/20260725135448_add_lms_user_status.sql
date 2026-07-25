create type public."AccountStatus" as enum ('ACTIVE', 'DISABLED');

alter table public.lms_users
add column status public."AccountStatus" not null default 'ACTIVE';

create or replace function private.current_lms_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.lms_users as u
  where auth.uid() is not null
    and u.supabase_id = auth.uid()::text
    and u.status = 'ACTIVE'::public."AccountStatus"
$$;

create or replace function private.current_lms_role()
returns public."Role"
language sql
stable
security definer
set search_path = ''
as $$
  select u.role
  from public.lms_users as u
  where auth.uid() is not null
    and u.supabase_id = auth.uid()::text
    and u.status = 'ACTIVE'::public."AccountStatus"
$$;

alter table public.lms_users
  add column phone_number text,
  add column phone_verified boolean not null default false;

alter table public.lms_users
  add constraint lms_users_phone_number_key unique (phone_number),
  add constraint lms_users_phone_number_e164
    check (
      phone_number is null
      or phone_number ~ '^\+[1-9][0-9]{7,14}$'
    ),
  add constraint lms_users_phone_verified_requires_number
    check (not phone_verified or phone_number is not null);

create or replace function private.handle_lms_user_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_phone text;
begin
  resolved_phone := coalesce(
    nullif(new.phone, ''),
    nullif(new.raw_user_meta_data ->> 'phone_number', '')
  );

  insert into public.lms_users (
    id,
    supabase_id,
    email,
    name,
    phone_number,
    phone_verified,
    role,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid()::text,
    new.id::text,
    lower(coalesce(new.email, new.id::text || '@invalid.local')),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    resolved_phone,
    (
      resolved_phone is not null
      and nullif(new.phone, '') = resolved_phone
      and new.phone_confirmed_at is not null
    ),
    'STUDENT'::public."Role",
    now(),
    now()
  )
  on conflict (supabase_id) do update
  set
    email = excluded.email,
    name = coalesce(excluded.name, public.lms_users.name),
    phone_number = excluded.phone_number,
    phone_verified = excluded.phone_verified,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_for_lms on auth.users;

create trigger on_auth_user_created_for_lms
after insert or update of
  email,
  phone,
  phone_confirmed_at,
  raw_user_meta_data
on auth.users
for each row execute function private.handle_lms_user_signup();

update public.lms_users as profile
set
  phone_number = coalesce(
    nullif(auth_user.phone, ''),
    nullif(auth_user.raw_user_meta_data ->> 'phone_number', '')
  ),
  phone_verified = (
    nullif(auth_user.phone, '') is not null
    and auth_user.phone_confirmed_at is not null
  ),
  updated_at = now()
from auth.users as auth_user
where profile.supabase_id = auth_user.id::text;

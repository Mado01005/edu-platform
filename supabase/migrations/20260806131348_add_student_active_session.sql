begin;

alter table public.lms_users
  add column if not exists active_session_token text,
  add column if not exists last_login_device text,
  add column if not exists last_login_at timestamp(3);

create unique index if not exists lms_users_active_session_token_key
  on public.lms_users(active_session_token)
  where active_session_token is not null;

comment on column public.lms_users.active_session_token is
  'SHA-256 hash of the current student device session cookie. The raw token is never stored.';

commit;

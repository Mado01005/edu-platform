do $$
begin
  create type public."SupportInquiryStatus" as enum (
    'NEW',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.support_inquiries (
  id text primary key,
  first_name text not null check (char_length(first_name) between 2 and 80),
  last_name text not null check (char_length(last_name) between 2 and 80),
  phone text not null check (char_length(phone) between 8 and 32),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 10 and 4000),
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  status public."SupportInquiryStatus" not null default 'NEW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_inquiries_status_created_at_idx
  on public.support_inquiries (status, created_at desc);

create index if not exists support_inquiries_email_created_at_idx
  on public.support_inquiries (email, created_at desc);

alter table public.support_inquiries enable row level security;

revoke all on table public.support_inquiries from anon, authenticated;
grant select, insert, update, delete on table public.support_inquiries to service_role;

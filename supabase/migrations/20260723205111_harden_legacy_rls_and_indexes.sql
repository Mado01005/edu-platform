-- Legacy telemetry and role data is accessed only through authenticated
-- server routes using the service role. Service roles bypass RLS and do not
-- require permissive client policies.
alter table if exists public.activity_logs enable row level security;
alter table if exists public.live_sessions enable row level security;

drop policy if exists "Admins can read all logs" on public.activity_logs;
drop policy if exists "Users can insert activity logs" on public.activity_logs;
drop policy if exists "Allow Read Access for authenticated admins" on public.live_sessions;
drop policy if exists "Allow Service Role Full Access to Sessions" on public.live_sessions;
drop policy if exists "Allow Read Access for authenticated admins" on public.sessions;
drop policy if exists "Allow Service Role Full Access to Sessions" on public.sessions;
drop policy if exists "Users can manage their own snippets" on public.user_snippets;
drop policy if exists "Users can view their own achievements" on public.user_achievements;

-- Public object URLs do not require a broad storage.objects listing policy.
drop policy if exists "Public Access to content bucket" on storage.objects;

create index if not exists content_items_lesson_id_idx
  on public.content_items (lesson_id);
create index if not exists content_items_parent_id_idx
  on public.content_items (parent_id);
create index if not exists lms_discussions_user_id_idx
  on public.lms_discussions (user_id);

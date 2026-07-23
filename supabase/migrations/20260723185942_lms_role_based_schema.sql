create type public."Role" as enum ('STUDENT', 'TEACHER', 'ADMIN');
create type public."ContentType" as enum ('VIMEO', 'YOUTUBE', 'R2_VIDEO', 'PDF', 'TEXT');

create table public.lms_users (
  id text primary key,
  supabase_id text not null unique,
  email text not null unique,
  name text,
  role public."Role" not null default 'STUDENT',
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null
);

create table public.lms_courses (
  id text primary key,
  title text not null,
  description text,
  image_url text,
  is_published boolean not null default false,
  teacher_id text not null references public.lms_users(id) on delete cascade on update cascade,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null
);

create table public.lms_modules (
  id text primary key,
  title text not null,
  position integer not null,
  course_id text not null references public.lms_courses(id) on delete cascade on update cascade,
  created_at timestamp(3) not null default current_timestamp
);

create table public.lms_lessons (
  id text primary key,
  title text not null,
  position integer not null,
  content_type public."ContentType" not null default 'VIMEO',
  video_url text,
  pdf_url text,
  text_content text,
  is_free boolean not null default false,
  module_id text not null references public.lms_modules(id) on delete cascade on update cascade,
  created_at timestamp(3) not null default current_timestamp
);

create table public.lms_enrollments (
  id text primary key,
  student_id text not null references public.lms_users(id) on delete cascade on update cascade,
  course_id text not null references public.lms_courses(id) on delete cascade on update cascade,
  created_at timestamp(3) not null default current_timestamp,
  unique (student_id, course_id)
);

create table public.lms_lesson_progress (
  id text primary key,
  student_id text not null references public.lms_users(id) on delete cascade on update cascade,
  lesson_id text not null references public.lms_lessons(id) on delete cascade on update cascade,
  is_completed boolean not null default false,
  updated_at timestamp(3) not null,
  unique (student_id, lesson_id)
);

create table public.lms_zoom_sessions (
  id text primary key,
  title text not null,
  meeting_url text not null,
  start_time timestamp(3) not null,
  duration integer not null check (duration between 5 and 480),
  course_id text not null references public.lms_courses(id) on delete cascade on update cascade,
  teacher_id text not null references public.lms_users(id) on delete cascade on update cascade,
  created_at timestamp(3) not null default current_timestamp
);

create table public.lms_discussions (
  id text primary key,
  message text not null,
  user_id text not null references public.lms_users(id) on delete cascade on update cascade,
  lesson_id text not null references public.lms_lessons(id) on delete cascade on update cascade,
  parent_id text references public.lms_discussions(id) on delete cascade on update cascade,
  created_at timestamp(3) not null default current_timestamp
);

create index lms_courses_teacher_id_idx on public.lms_courses(teacher_id);
create index lms_modules_course_id_position_idx on public.lms_modules(course_id, position);
create index lms_lessons_module_id_position_idx on public.lms_lessons(module_id, position);
create index lms_enrollments_course_id_idx on public.lms_enrollments(course_id);
create index lms_lesson_progress_lesson_id_idx on public.lms_lesson_progress(lesson_id);
create index lms_zoom_sessions_course_id_start_time_idx on public.lms_zoom_sessions(course_id, start_time);
create index lms_zoom_sessions_teacher_id_idx on public.lms_zoom_sessions(teacher_id);
create index lms_discussions_lesson_id_created_at_idx on public.lms_discussions(lesson_id, created_at);
create index lms_discussions_parent_id_idx on public.lms_discussions(parent_id);

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

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
$$;

create or replace function private.is_enrolled_in_lms_course(course_id_input text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lms_enrollments as e
    join public.lms_users as u on u.id = e.student_id
    where auth.uid() is not null
      and u.supabase_id = auth.uid()::text
      and e.course_id = course_id_input
  )
$$;

revoke all on function private.current_lms_user_id() from public, anon;
revoke all on function private.current_lms_role() from public, anon;
revoke all on function private.is_enrolled_in_lms_course(text) from public, anon;
grant execute on function private.current_lms_user_id() to authenticated;
grant execute on function private.current_lms_role() to authenticated;
grant execute on function private.is_enrolled_in_lms_course(text) to authenticated;

create or replace function private.handle_lms_user_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lms_users (
    id,
    supabase_id,
    email,
    name,
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
    'STUDENT'::public."Role",
    now(),
    now()
  )
  on conflict (supabase_id) do update
  set
    email = excluded.email,
    name = coalesce(excluded.name, public.lms_users.name),
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.handle_lms_user_signup() from public, anon, authenticated;

create trigger on_auth_user_created_for_lms
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function private.handle_lms_user_signup();

insert into public.lms_users (
  id,
  supabase_id,
  email,
  name,
  role,
  created_at,
  updated_at
)
select
  gen_random_uuid()::text,
  au.id::text,
  lower(coalesce(au.email, au.id::text || '@invalid.local')),
  coalesce(
    au.raw_user_meta_data ->> 'full_name',
    au.raw_user_meta_data ->> 'name'
  ),
  'STUDENT'::public."Role",
  now(),
  now()
from auth.users as au
on conflict (supabase_id) do nothing;

alter table public.lms_users enable row level security;
alter table public.lms_courses enable row level security;
alter table public.lms_modules enable row level security;
alter table public.lms_lessons enable row level security;
alter table public.lms_enrollments enable row level security;
alter table public.lms_lesson_progress enable row level security;
alter table public.lms_zoom_sessions enable row level security;
alter table public.lms_discussions enable row level security;

grant select on table
  public.lms_users,
  public.lms_courses,
  public.lms_modules,
  public.lms_lessons,
  public.lms_enrollments,
  public.lms_lesson_progress,
  public.lms_zoom_sessions,
  public.lms_discussions
to authenticated;

grant insert, update, delete on table
  public.lms_courses,
  public.lms_modules,
  public.lms_lessons,
  public.lms_enrollments,
  public.lms_lesson_progress,
  public.lms_zoom_sessions,
  public.lms_discussions
to authenticated;

grant update (name) on table public.lms_users to authenticated;

create policy "users read own profile"
on public.lms_users for select to authenticated
using (id = (select private.current_lms_user_id()));

create policy "users update own display name"
on public.lms_users for update to authenticated
using (id = (select private.current_lms_user_id()))
with check (id = (select private.current_lms_user_id()));

create policy "published or related courses are readable"
on public.lms_courses for select to authenticated
using (
  is_published
  or teacher_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'
  or (select private.is_enrolled_in_lms_course(id))
);

create policy "teachers create their courses"
on public.lms_courses for insert to authenticated
with check (
  teacher_id = (select private.current_lms_user_id())
  and (select private.current_lms_role()) in ('TEACHER', 'ADMIN')
);

create policy "teachers update their courses"
on public.lms_courses for update to authenticated
using (
  teacher_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'
)
with check (
  teacher_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'
);

create policy "teachers delete their courses"
on public.lms_courses for delete to authenticated
using (
  teacher_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'
);

create policy "course modules are readable with course"
on public.lms_modules for select to authenticated
using (
  exists (
    select 1 from public.lms_courses c
    where c.id = course_id
  )
);

create policy "teachers manage course modules"
on public.lms_modules for all to authenticated
using (
  exists (
    select 1 from public.lms_courses c
    where c.id = course_id
      and (
        c.teacher_id = (select private.current_lms_user_id())
        or (select private.current_lms_role()) = 'ADMIN'
      )
  )
)
with check (
  exists (
    select 1 from public.lms_courses c
    where c.id = course_id
      and (
        c.teacher_id = (select private.current_lms_user_id())
        or (select private.current_lms_role()) = 'ADMIN'
      )
  )
);

create policy "course lessons are readable with module"
on public.lms_lessons for select to authenticated
using (
  exists (
    select 1
    from public.lms_modules m
    join public.lms_courses c on c.id = m.course_id
    where m.id = module_id
  )
);

create policy "teachers manage course lessons"
on public.lms_lessons for all to authenticated
using (
  exists (
    select 1
    from public.lms_modules m
    join public.lms_courses c on c.id = m.course_id
    where m.id = module_id
      and (
        c.teacher_id = (select private.current_lms_user_id())
        or (select private.current_lms_role()) = 'ADMIN'
      )
  )
)
with check (
  exists (
    select 1
    from public.lms_modules m
    join public.lms_courses c on c.id = m.course_id
    where m.id = module_id
      and (
        c.teacher_id = (select private.current_lms_user_id())
        or (select private.current_lms_role()) = 'ADMIN'
      )
  )
);

create policy "enrollments visible to student and teacher"
on public.lms_enrollments for select to authenticated
using (
  student_id = (select private.current_lms_user_id())
  or exists (
    select 1 from public.lms_courses c
    where c.id = course_id
      and (
        c.teacher_id = (select private.current_lms_user_id())
        or (select private.current_lms_role()) = 'ADMIN'
      )
  )
);

create policy "students enroll themselves"
on public.lms_enrollments for insert to authenticated
with check (
  student_id = (select private.current_lms_user_id())
  and exists (
    select 1 from public.lms_courses c
    where c.id = course_id and c.is_published
  )
);

create policy "students leave courses"
on public.lms_enrollments for delete to authenticated
using (student_id = (select private.current_lms_user_id()));

create policy "students read own progress"
on public.lms_lesson_progress for select to authenticated
using (
  student_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) in ('TEACHER', 'ADMIN')
);

create policy "students create own progress"
on public.lms_lesson_progress for insert to authenticated
with check (student_id = (select private.current_lms_user_id()));

create policy "students update own progress"
on public.lms_lesson_progress for update to authenticated
using (student_id = (select private.current_lms_user_id()))
with check (student_id = (select private.current_lms_user_id()));

create policy "related zoom sessions are readable"
on public.lms_zoom_sessions for select to authenticated
using (
  teacher_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'
  or exists (
    select 1 from public.lms_enrollments e
    where e.course_id = course_id
      and e.student_id = (select private.current_lms_user_id())
  )
);

create policy "teachers manage zoom sessions"
on public.lms_zoom_sessions for all to authenticated
using (
  teacher_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'
)
with check (
  teacher_id = (select private.current_lms_user_id())
  and exists (
    select 1 from public.lms_courses c
    where c.id = course_id and c.teacher_id = teacher_id
  )
  or (select private.current_lms_role()) = 'ADMIN'
);

create policy "discussion participants can read"
on public.lms_discussions for select to authenticated
using (
  exists (
    select 1
    from public.lms_lessons l
    join public.lms_modules m on m.id = l.module_id
    join public.lms_courses c on c.id = m.course_id
    where l.id = lesson_id
  )
);

create policy "users create their discussion posts"
on public.lms_discussions for insert to authenticated
with check (user_id = (select private.current_lms_user_id()));

create policy "users delete their discussion posts"
on public.lms_discussions for delete to authenticated
using (
  user_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'
);

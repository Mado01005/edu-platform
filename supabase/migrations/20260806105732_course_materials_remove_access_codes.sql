begin;

alter table public.lms_courses
  add column slug text;

update public.lms_courses
set slug = concat(
  coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'course'
  ),
  '-',
  substr(md5(id), 1, 4)
);

with duplicate_slugs as (
  select
    id,
    row_number() over (partition by slug order by id) as duplicate_number
  from public.lms_courses
)
update public.lms_courses as course
set slug = concat(course.slug, '-', substr(md5(course.id), 5, 8))
from duplicate_slugs
where duplicate_slugs.id = course.id
  and duplicate_slugs.duplicate_number > 1;

alter table public.lms_courses
  alter column slug set not null,
  add constraint lms_courses_slug_key unique (slug),
  add constraint lms_courses_slug_check check (
    slug ~ '^[a-z0-9][a-z0-9_-]{0,180}$'
  );

create table public.lms_course_materials (
  id text primary key,
  title text not null,
  file_url text not null,
  object_key text not null unique,
  file_type text not null,
  file_size integer,
  course_id text,
  lesson_id text,
  created_at timestamp(3) not null default current_timestamp,
  constraint lms_course_materials_course_id_fkey
    foreign key (course_id) references public.lms_courses(id)
    on delete cascade on update cascade,
  constraint lms_course_materials_lesson_id_fkey
    foreign key (lesson_id) references public.lms_lessons(id)
    on delete cascade on update cascade,
  constraint lms_course_materials_target_check check (
    (course_id is not null)::integer + (lesson_id is not null)::integer = 1
  ),
  constraint lms_course_materials_title_check check (
    char_length(btrim(title)) between 1 and 200
  ),
  constraint lms_course_materials_file_type_check check (
    file_type in ('PDF', 'DOC', 'DOCX', 'SLIDES', 'ZIP', 'WORKSHEET')
  ),
  constraint lms_course_materials_file_size_check check (
    file_size is null or file_size between 1 and 104857600
  ),
  constraint lms_course_materials_file_url_check check (
    file_url ~ '^https://'
  ),
  constraint lms_course_materials_object_key_check check (
    object_key ~ '^lms/[^/]+/materials/(course|lesson)/[^/]+/[^/]+$'
  )
);

create index lms_course_materials_course_id_created_at_idx
  on public.lms_course_materials(course_id, created_at);
create index lms_course_materials_lesson_id_created_at_idx
  on public.lms_course_materials(lesson_id, created_at);

alter table public.lms_course_materials enable row level security;
revoke all on table public.lms_course_materials from anon, authenticated;
grant select, insert, update, delete on table public.lms_course_materials to service_role;

drop table if exists public.lms_digital_access_codes;
drop type if exists public."AccessCodeStatus";

commit;

begin;

alter type public."ContentType" add value if not exists 'QUIZ';
alter type public."ContentType" add value if not exists 'ASSIGNMENT';

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'AssignmentSubmissionStatus'
  ) then
    create type public."AssignmentSubmissionStatus" as enum ('SUBMITTED', 'GRADED');
  end if;
end $$;

alter table public.lms_courses
  add column grade_level public."GradeLevel";

alter table public.lms_lessons
  add column duration_min integer,
  add constraint lms_lessons_duration_min_check check (
    duration_min is null or duration_min between 1 and 1440
  );

alter table public.lms_course_materials
  add column module_id text;

alter table public.lms_course_materials
  add constraint lms_course_materials_module_id_fkey
  foreign key (module_id) references public.lms_modules(id)
  on delete cascade on update cascade;

alter table public.lms_course_materials
  drop constraint lms_course_materials_target_check,
  add constraint lms_course_materials_target_check check (
    (course_id is not null)::integer
      + (module_id is not null)::integer
      + (lesson_id is not null)::integer = 1
  );

alter table public.lms_course_materials
  drop constraint lms_course_materials_object_key_check,
  add constraint lms_course_materials_object_key_check check (
    object_key ~ '^lms/[^/]+/materials/(course|module|lesson)/[^/]+/[^/]+$'
  );

create index lms_course_materials_module_id_created_at_idx
  on public.lms_course_materials(module_id, created_at);
create index lms_courses_grade_level_idx
  on public.lms_courses(grade_level);

alter table public.lms_assignments
  add column lesson_id text,
  add column instructions text,
  add column question_count integer not null default 0;

alter table public.lms_assignments
  add constraint lms_assignments_lesson_id_fkey
  foreign key (lesson_id) references public.lms_lessons(id)
  on delete cascade on update cascade,
  add constraint lms_assignments_lesson_id_key unique (lesson_id),
  add constraint lms_assignments_question_count_check check (
    question_count between 0 and 500
  );

do $$
begin
  if exists (select 1 from public.lms_assignments where lesson_id is null) then
    raise exception 'Existing assignments must be linked to lessons before this migration can continue.';
  end if;
end $$;

alter table public.lms_assignments
  alter column lesson_id set not null;

alter table public.lms_assignment_submissions
  add column lesson_id text,
  add column file_url text,
  add column object_key text,
  add column file_type text,
  add column file_size integer,
  add column status public."AssignmentSubmissionStatus" not null default 'SUBMITTED',
  add column graded_at timestamp(3),
  add column updated_at timestamp(3) not null default current_timestamp;

update public.lms_assignment_submissions as submission
set lesson_id = assignment.lesson_id,
    status = case
      when submission.score_percentage is null then 'SUBMITTED'::public."AssignmentSubmissionStatus"
      else 'GRADED'::public."AssignmentSubmissionStatus"
    end,
    graded_at = case
      when submission.score_percentage is null then null
      else submission.submitted_at
    end
from public.lms_assignments as assignment
where assignment.id = submission.assignment_id;

do $$
begin
  if exists (
    select 1
    from public.lms_assignment_submissions
    where lesson_id is null
       or file_url is null
       or object_key is null
       or file_type is null
  ) then
    raise exception 'Existing submissions require file metadata before this migration can continue.';
  end if;
end $$;

alter table public.lms_assignment_submissions
  alter column lesson_id set not null,
  alter column file_url set not null,
  alter column object_key set not null,
  alter column file_type set not null,
  add constraint lms_assignment_submissions_lesson_id_fkey
    foreign key (lesson_id) references public.lms_lessons(id)
    on delete cascade on update cascade,
  add constraint lms_assignment_submissions_object_key_key unique (object_key),
  add constraint lms_assignment_submissions_file_url_check check (
    file_url ~ '^https://'
  ),
  add constraint lms_assignment_submissions_object_key_check check (
    object_key ~ '^lms/[^/]+/assignment-submissions/[^/]+/[^/]+$'
  ),
  add constraint lms_assignment_submissions_file_type_check check (
    file_type in ('PDF', 'JPG', 'PNG')
  ),
  add constraint lms_assignment_submissions_file_size_check check (
    file_size is null or file_size between 1 and 26214400
  ),
  add constraint lms_assignment_submissions_grade_status_check check (
    (status = 'SUBMITTED' and score_percentage is null and graded_at is null)
    or (status = 'GRADED' and score_percentage is not null and graded_at is not null)
  );

create index lms_assignment_submissions_lesson_id_status_submitted_at_idx
  on public.lms_assignment_submissions(lesson_id, status, submitted_at);
create index lms_assignment_submissions_status_submitted_at_idx
  on public.lms_assignment_submissions(status, submitted_at);

revoke all on table public.lms_courses,
  public.lms_modules,
  public.lms_lessons,
  public.lms_course_materials,
  public.lms_assignments,
  public.lms_assignment_submissions
from anon, authenticated;

grant select, insert, update, delete on table public.lms_courses,
  public.lms_modules,
  public.lms_lessons,
  public.lms_course_materials,
  public.lms_assignments,
  public.lms_assignment_submissions
to service_role;

commit;

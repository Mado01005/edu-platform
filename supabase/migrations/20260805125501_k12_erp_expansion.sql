begin;

alter type public."Role" add value if not exists 'SUPER_ADMIN';
alter type public."Role" add value if not exists 'PARENT';
alter type public."Role" add value if not exists 'SUPPORT';
alter type public."Role" add value if not exists 'ACCOUNTING';

create type public."GradeLevel" as enum (
  'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6',
  'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12'
);
create type public."AssignmentType" as enum ('QUIZ', 'HOMEWORK');
create type public."PaymentCurrency" as enum ('USD', 'EGP');
create type public."PaymentStatus" as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public."PaymentMethod" as enum ('WIRE_TRANSFER', 'CASH', 'ONLINE_CARD');
create type public."SubscriptionStatus" as enum ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

alter table public.lms_users
  add column grade_level public."GradeLevel";

alter table public.lms_courses
  add column subject_id text;

alter table public.lms_lesson_progress
  add column watch_percentage double precision;

update public.lms_lesson_progress
set watch_percentage = case when is_completed then 100.0 else 0.0 end;

alter table public.lms_lesson_progress
  alter column watch_percentage set default 0.0,
  alter column watch_percentage set not null,
  add constraint lms_lesson_progress_watch_percentage_check
    check (watch_percentage between 0 and 100);

create table public.lms_subjects (
  id text primary key,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  grade public."GradeLevel" not null,
  teacher_id text not null,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null,
  constraint lms_subjects_teacher_id_fkey
    foreign key (teacher_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_subjects_grade_name_key unique (grade, name)
);

alter table public.lms_courses
  add constraint lms_courses_subject_id_fkey
    foreign key (subject_id) references public.lms_subjects(id)
    on delete set null on update cascade;

create table public.lms_assignments (
  id text primary key,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  type public."AssignmentType" not null,
  course_id text not null,
  due_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  constraint lms_assignments_course_id_fkey
    foreign key (course_id) references public.lms_courses(id)
    on delete cascade on update cascade
);

create table public.lms_assignment_submissions (
  id text primary key,
  assignment_id text not null,
  student_id text not null,
  score_percentage double precision,
  submitted_at timestamp(3) not null default current_timestamp,
  constraint lms_assignment_submissions_score_percentage_check
    check (score_percentage is null or score_percentage between 0 and 100),
  constraint lms_assignment_submissions_assignment_id_fkey
    foreign key (assignment_id) references public.lms_assignments(id)
    on delete cascade on update cascade,
  constraint lms_assignment_submissions_student_id_fkey
    foreign key (student_id) references public.lms_users(id)
    on delete cascade on update cascade,
  constraint lms_assignment_submissions_assignment_id_student_id_key
    unique (assignment_id, student_id)
);

create table public.lms_student_health_scores (
  id text primary key,
  student_id text not null unique,
  health_percentage double precision not null default 100.0,
  last_login_at timestamp(3) not null default current_timestamp,
  video_completion double precision not null default 0.0,
  assignment_score double precision not null default 0.0,
  is_at_risk boolean not null default false,
  updated_at timestamp(3) not null,
  constraint lms_student_health_scores_student_id_fkey
    foreign key (student_id) references public.lms_users(id)
    on delete cascade on update cascade,
  constraint lms_student_health_scores_percentages_check
    check (
      health_percentage between 0 and 100
      and video_completion between 0 and 100
      and assignment_score between 0 and 100
    )
);

create table public.lms_system_notifications (
  id text primary key,
  user_id text not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  type text not null check (char_length(btrim(type)) between 1 and 40),
  is_read boolean not null default false,
  created_at timestamp(3) not null default current_timestamp,
  constraint lms_system_notifications_user_id_fkey
    foreign key (user_id) references public.lms_users(id)
    on delete cascade on update cascade
);

create table public.lms_web_push_subscriptions (
  id text primary key,
  user_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null,
  constraint lms_web_push_subscriptions_user_id_fkey
    foreign key (user_id) references public.lms_users(id)
    on delete cascade on update cascade,
  constraint lms_web_push_subscriptions_endpoint_https_check
    check (endpoint like 'https://%')
);

create table public.lms_student_subscriptions (
  id text primary key,
  student_id text not null,
  course_id text not null,
  status public."SubscriptionStatus" not null default 'PENDING',
  approved_by_id text,
  approved_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null,
  constraint lms_student_subscriptions_student_id_fkey
    foreign key (student_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_student_subscriptions_course_id_fkey
    foreign key (course_id) references public.lms_courses(id)
    on delete restrict on update cascade,
  constraint lms_student_subscriptions_approved_by_id_fkey
    foreign key (approved_by_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_student_subscriptions_student_id_course_id_key
    unique (student_id, course_id),
  constraint lms_student_subscriptions_approval_state_check
    check (
      (status = 'PENDING' and approved_by_id is null and approved_at is null)
      or status in ('REJECTED', 'EXPIRED')
      or (status = 'APPROVED' and approved_by_id is not null and approved_at is not null)
    )
);

create table public.lms_usd_manual_ledger (
  id text primary key,
  student_id text not null,
  currency public."PaymentCurrency" not null,
  amount_usd numeric(12, 2),
  amount_egp numeric(12, 2),
  exchange_rate numeric(12, 4),
  payment_type public."PaymentMethod" not null,
  receipt_number text not null unique,
  receipt_url text,
  notes text,
  status public."PaymentStatus" not null default 'PENDING',
  subscription_id text,
  created_by_id text not null,
  approved_by_id text,
  approved_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null,
  constraint lms_usd_manual_ledger_student_id_fkey
    foreign key (student_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_usd_manual_ledger_subscription_id_fkey
    foreign key (subscription_id) references public.lms_student_subscriptions(id)
    on delete set null on update cascade,
  constraint lms_usd_manual_ledger_created_by_id_fkey
    foreign key (created_by_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_usd_manual_ledger_approved_by_id_fkey
    foreign key (approved_by_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_usd_manual_ledger_receipt_number_check
    check (receipt_number ~ '^[A-Za-z0-9][A-Za-z0-9/_-]{2,79}$'),
  constraint lms_usd_manual_ledger_receipt_url_check
    check (receipt_url is null or receipt_url like 'https://%'),
  constraint lms_usd_manual_ledger_currency_amount_check
    check (
      (
        currency = 'USD'
        and amount_usd is not null
        and amount_usd between 0.01 and 999999999.99
        and amount_egp is null
        and exchange_rate is null
      )
      or (
        currency = 'EGP'
        and amount_usd is not null
        and amount_egp is not null
        and exchange_rate is not null
        and amount_usd between 0.01 and 999999999.99
        and amount_egp between 0.01 and 999999999.99
        and exchange_rate between 0.0001 and 999999.9999
        and amount_usd = round(amount_egp / exchange_rate, 2)
      )
    ),
  constraint lms_usd_manual_ledger_approval_state_check
    check (
      (status = 'PENDING' and approved_by_id is null and approved_at is null)
      or (
        status in ('APPROVED', 'REJECTED')
        and approved_by_id is not null
        and approved_at is not null
      )
    )
);

create table public.lms_parent_students (
  id text primary key,
  parent_id text not null,
  student_id text not null,
  created_at timestamp(3) not null default current_timestamp,
  constraint lms_parent_students_parent_id_fkey
    foreign key (parent_id) references public.lms_users(id)
    on delete cascade on update cascade,
  constraint lms_parent_students_student_id_fkey
    foreign key (student_id) references public.lms_users(id)
    on delete cascade on update cascade,
  constraint lms_parent_students_parent_id_student_id_key
    unique (parent_id, student_id),
  constraint lms_parent_students_distinct_users_check
    check (parent_id <> student_id)
);

create index lms_subjects_teacher_id_idx
  on public.lms_subjects(teacher_id);
create index lms_courses_subject_id_idx
  on public.lms_courses(subject_id);
create index lms_users_role_grade_level_idx
  on public.lms_users(role, grade_level);
create index lms_assignments_course_id_due_at_idx
  on public.lms_assignments(course_id, due_at);
create index lms_assignment_submissions_student_id_submitted_at_idx
  on public.lms_assignment_submissions(student_id, submitted_at);
create index lms_student_health_scores_is_at_risk_health_percentage_idx
  on public.lms_student_health_scores(is_at_risk, health_percentage);
create index lms_system_notifications_user_id_is_read_created_at_idx
  on public.lms_system_notifications(user_id, is_read, created_at);
create index lms_web_push_subscriptions_user_id_idx
  on public.lms_web_push_subscriptions(user_id);
create index lms_student_subscriptions_status_created_at_idx
  on public.lms_student_subscriptions(status, created_at);
create index lms_student_subscriptions_course_id_idx
  on public.lms_student_subscriptions(course_id);
create index lms_student_subscriptions_approved_by_id_idx
  on public.lms_student_subscriptions(approved_by_id);
create index lms_usd_manual_ledger_student_id_created_at_idx
  on public.lms_usd_manual_ledger(student_id, created_at);
create index lms_usd_manual_ledger_status_created_at_idx
  on public.lms_usd_manual_ledger(status, created_at);
create index lms_usd_manual_ledger_subscription_id_idx
  on public.lms_usd_manual_ledger(subscription_id);
create index lms_usd_manual_ledger_created_by_id_idx
  on public.lms_usd_manual_ledger(created_by_id);
create index lms_usd_manual_ledger_approved_by_id_idx
  on public.lms_usd_manual_ledger(approved_by_id);
create index lms_parent_students_student_id_idx
  on public.lms_parent_students(student_id);

create or replace function private.current_lms_role()
returns public."Role"
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when u.role::text = 'SUPER_ADMIN' then 'ADMIN'::public."Role"
      else u.role
    end
  from public.lms_users as u
  where auth.uid() is not null
    and u.supabase_id = auth.uid()::text
    and u.status = 'ACTIVE'::public."AccountStatus"
$$;

revoke all on function private.current_lms_role() from public, anon;
grant execute on function private.current_lms_role() to authenticated;

create or replace function private.handle_lms_user_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_phone text;
  resolved_grade public."GradeLevel";
begin
  resolved_phone := coalesce(
    nullif(new.phone, ''),
    nullif(new.raw_user_meta_data ->> 'phone_number', '')
  );
  resolved_grade := case
    when coalesce(new.raw_user_meta_data ->> 'grade_level', '')
      ~ '^GRADE_([1-9]|1[0-2])$'
    then (new.raw_user_meta_data ->> 'grade_level')::public."GradeLevel"
    else null
  end;

  insert into public.lms_users (
    id,
    supabase_id,
    email,
    name,
    phone_number,
    phone_verified,
    role,
    grade_level,
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
    resolved_grade,
    now(),
    now()
  )
  on conflict (supabase_id) do update
  set
    email = excluded.email,
    name = coalesce(excluded.name, public.lms_users.name),
    phone_number = excluded.phone_number,
    phone_verified = excluded.phone_verified,
    grade_level = coalesce(excluded.grade_level, public.lms_users.grade_level),
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.handle_lms_user_signup()
  from public, anon, authenticated;

create or replace function private.sync_lms_student_health_risk()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.is_at_risk := new.health_percentage < 70;
  return new;
end;
$$;

revoke all on function private.sync_lms_student_health_risk()
  from public, anon, authenticated;

create trigger sync_lms_student_health_risk
before insert or update
on public.lms_student_health_scores
for each row execute function private.sync_lms_student_health_risk();

create or replace function private.validate_lms_erp_relations()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'lms_subjects' then
    if not exists (
      select 1 from public.lms_users
      where id = new.teacher_id
        and role::text = 'TEACHER'
        and status::text = 'ACTIVE'
    ) then
      raise exception 'Each K-12 subject requires one active TEACHER.';
    end if;
  elsif tg_table_name in (
    'lms_enrollments',
    'lms_lesson_progress',
    'lms_assignment_submissions',
    'lms_student_health_scores'
  ) then
    if (tg_op = 'INSERT' or new.student_id is distinct from old.student_id)
      and not exists (
      select 1 from public.lms_users
      where id = new.student_id
        and role::text = 'STUDENT'
        and status::text = 'ACTIVE'
    ) then
      raise exception 'Student learning records may only belong to STUDENT accounts.';
    end if;
  elsif tg_table_name = 'lms_parent_students' then
    if (tg_op = 'INSERT'
      or new.parent_id is distinct from old.parent_id
      or new.student_id is distinct from old.student_id)
      and (not exists (
      select 1 from public.lms_users
      where id = new.parent_id
        and role::text = 'PARENT'
        and status::text = 'ACTIVE'
    ) or not exists (
      select 1 from public.lms_users
      where id = new.student_id
        and role::text = 'STUDENT'
        and status::text = 'ACTIVE'
    )) then
      raise exception 'Parent links require PARENT and STUDENT accounts.';
    end if;
  elsif tg_table_name = 'lms_student_subscriptions' then
    if (tg_op = 'INSERT' or new.student_id is distinct from old.student_id)
      and not exists (
      select 1 from public.lms_users
      where id = new.student_id
        and role::text = 'STUDENT'
        and status::text = 'ACTIVE'
    ) then
      raise exception 'Subscriptions may only belong to STUDENT accounts.';
    end if;
    if tg_op = 'INSERT' then
      if new.approved_by_id is not null and not exists (
        select 1 from public.lms_users
        where id = new.approved_by_id
          and role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING')
          and status::text = 'ACTIVE'
      ) then
        raise exception 'Subscription approval requires an active accounting operator.';
      end if;
    elsif new.approved_by_id is not null and (
      new.approved_by_id is distinct from old.approved_by_id
      or new.status is distinct from old.status
    ) then
      if not exists (
        select 1 from public.lms_users
        where id = new.approved_by_id
          and role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING')
          and status::text = 'ACTIVE'
      ) then
        raise exception 'Subscription approval requires an active accounting operator.';
      end if;
    end if;
  elsif tg_table_name = 'lms_usd_manual_ledger' then
    if (tg_op = 'INSERT' or new.student_id is distinct from old.student_id)
      and not exists (
      select 1 from public.lms_users
      where id = new.student_id
        and role::text = 'STUDENT'
        and status::text = 'ACTIVE'
    ) then
      raise exception 'Payments may only belong to STUDENT accounts.';
    end if;
    if tg_op = 'INSERT' then
      if not exists (
        select 1 from public.lms_users
        where id = new.created_by_id
          and role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING')
          and status::text = 'ACTIVE'
      ) then
        raise exception 'Payments require an active accounting operator.';
      end if;
    elsif new.created_by_id is distinct from old.created_by_id then
      if not exists (
        select 1 from public.lms_users
        where id = new.created_by_id
          and role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING')
          and status::text = 'ACTIVE'
      ) then
        raise exception 'Payments require an active accounting operator.';
      end if;
    end if;
    if tg_op = 'INSERT' then
      if new.approved_by_id is not null and not exists (
        select 1 from public.lms_users
        where id = new.approved_by_id
          and role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING')
          and status::text = 'ACTIVE'
      ) then
        raise exception 'Payment approval requires an active accounting operator.';
      end if;
    elsif new.approved_by_id is not null and (
      new.approved_by_id is distinct from old.approved_by_id
      or new.status is distinct from old.status
    ) then
      if not exists (
        select 1 from public.lms_users
        where id = new.approved_by_id
          and role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING')
          and status::text = 'ACTIVE'
      ) then
        raise exception 'Payment approval requires an active accounting operator.';
      end if;
    end if;
    if new.subscription_id is not null and not exists (
      select 1 from public.lms_student_subscriptions
      where id = new.subscription_id
        and student_id = new.student_id
    ) then
      raise exception 'Payment subscriptions must belong to the same student.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_lms_erp_relations()
  from public, anon, authenticated;

create trigger validate_lms_subject_teacher
before insert or update on public.lms_subjects
for each row execute function private.validate_lms_erp_relations();
create trigger validate_lms_enrollment_student
before insert or update on public.lms_enrollments
for each row execute function private.validate_lms_erp_relations();
create trigger validate_lms_progress_student
before insert or update on public.lms_lesson_progress
for each row execute function private.validate_lms_erp_relations();
create trigger validate_lms_submission_student
before insert or update on public.lms_assignment_submissions
for each row execute function private.validate_lms_erp_relations();
create trigger validate_lms_health_student
before insert or update on public.lms_student_health_scores
for each row execute function private.validate_lms_erp_relations();
create trigger validate_lms_parent_student
before insert or update on public.lms_parent_students
for each row execute function private.validate_lms_erp_relations();
create trigger validate_lms_subscription_student
before insert or update on public.lms_student_subscriptions
for each row execute function private.validate_lms_erp_relations();
create trigger validate_lms_payment_roles
before insert or update on public.lms_usd_manual_ledger
for each row execute function private.validate_lms_erp_relations();

create or replace function private.validate_lms_user_role_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.role::text = 'TEACHER'
    and (
      new.role::text <> 'TEACHER'
      or new.status::text <> 'ACTIVE'
    )
    and (
      exists (
        select 1 from public.lms_subjects where teacher_id = old.id
      )
      or exists (
        select 1 from public.lms_courses where teacher_id = old.id
      )
    )
  then
    raise exception 'Reassign this teacher''s subjects and courses first.';
  end if;

  if new.role is distinct from old.role then
    if old.role::text = 'STUDENT' and (
      exists (select 1 from public.lms_enrollments where student_id = old.id)
      or exists (select 1 from public.lms_lesson_progress where student_id = old.id)
      or exists (select 1 from public.lms_assignment_submissions where student_id = old.id)
      or exists (select 1 from public.lms_student_health_scores where student_id = old.id)
      or exists (select 1 from public.lms_student_subscriptions where student_id = old.id)
      or exists (select 1 from public.lms_usd_manual_ledger where student_id = old.id)
      or exists (select 1 from public.lms_parent_students where student_id = old.id)
    ) then
      raise exception 'Remove this student''s role-bound records before changing roles.';
    end if;

    if old.role::text = 'PARENT'
      and exists (
        select 1 from public.lms_parent_students where parent_id = old.id
      )
    then
      raise exception 'Remove this parent''s student links before changing roles.';
    end if;

    if new.role::text <> 'STUDENT' then
      new.grade_level := null;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_lms_user_role_transition()
  from public, anon, authenticated;

create trigger validate_lms_user_role_transition
before update of role, status on public.lms_users
for each row execute function private.validate_lms_user_role_transition();

drop policy if exists "students enroll themselves" on public.lms_enrollments;
create policy "students enroll themselves"
on public.lms_enrollments for insert to authenticated
with check (
  student_id = (select private.current_lms_user_id())
  and (select private.current_lms_role()) = 'STUDENT'::public."Role"
  and exists (
    select 1 from public.lms_courses as course
    where course.id = course_id and course.is_published
  )
);

drop policy if exists "students leave courses" on public.lms_enrollments;
create policy "students leave courses"
on public.lms_enrollments for delete to authenticated
using (
  student_id = (select private.current_lms_user_id())
  and (select private.current_lms_role()) = 'STUDENT'::public."Role"
);

drop policy if exists "students create own progress" on public.lms_lesson_progress;
drop policy if exists "students update own progress" on public.lms_lesson_progress;
revoke insert, update, delete on table public.lms_lesson_progress
  from authenticated;

drop policy if exists "students read own progress" on public.lms_lesson_progress;
create policy "students read own progress"
on public.lms_lesson_progress for select to authenticated
using (
  student_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'::public."Role"
  or (
    (select private.current_lms_role()) = 'TEACHER'::public."Role"
    and exists (
      select 1
      from public.lms_lessons as lesson
      join public.lms_modules as module on module.id = lesson.module_id
      join public.lms_courses as course on course.id = module.course_id
      where lesson.id = lesson_id
        and course.teacher_id = (select private.current_lms_user_id())
    )
  )
);

alter table public.lms_subjects enable row level security;
alter table public.lms_assignments enable row level security;
alter table public.lms_assignment_submissions enable row level security;
alter table public.lms_student_health_scores enable row level security;
alter table public.lms_system_notifications enable row level security;
alter table public.lms_web_push_subscriptions enable row level security;
alter table public.lms_student_subscriptions enable row level security;
alter table public.lms_usd_manual_ledger enable row level security;
alter table public.lms_parent_students enable row level security;

revoke all on table
  public.lms_subjects,
  public.lms_assignments,
  public.lms_assignment_submissions,
  public.lms_student_health_scores,
  public.lms_system_notifications,
  public.lms_web_push_subscriptions,
  public.lms_student_subscriptions,
  public.lms_usd_manual_ledger,
  public.lms_parent_students
from anon, authenticated;

commit;

-- Oqool Academy enterprise LMS additions.
-- This migration is additive. Existing auth identities, enrollments, course
-- content, progress, submissions, and payment records are preserved.

do $$
begin
  create type "PurchaseKind" as enum ('TERM_PACKAGE', 'CHAPTER');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type "WhatsAppDispatchStatus" as enum ('PENDING', 'SENT', 'FAILED');
exception
  when duplicate_object then null;
end
$$;

alter table public.lms_users
  add column if not exists city text,
  add column if not exists governorate text,
  add column if not exists parent_phone text,
  add column if not exists onboarding_completed_at timestamp(3);

alter table public.lms_modules
  add column if not exists standalone_price_egp numeric(12, 2) not null default 0;

alter table public.lms_course_materials
  add column if not exists is_downloadable boolean not null default false;

alter table public.lms_assignments
  add column if not exists duration_min integer not null default 45,
  add column if not exists max_attempts integer not null default 2;

alter table public.lms_assignment_submissions
  alter column file_url drop not null,
  alter column object_key drop not null,
  alter column file_type drop not null,
  add column if not exists attachment_urls jsonb,
  add column if not exists attachment_object_keys jsonb,
  add column if not exists text_solution text,
  add column if not exists rubric_selections jsonb;

alter table public.lms_digital_attendance
  add column if not exists left_at timestamp(3);

alter table public.lms_online_payment_submissions
  add column if not exists module_id text,
  add column if not exists purchase_kind "PurchaseKind" not null default 'TERM_PACKAGE';

do $$
begin
  alter table public.lms_modules
    add constraint lms_modules_standalone_price_egp_check
    check (standalone_price_egp >= 0);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.lms_assignments
    add constraint lms_assignments_duration_min_check
    check (duration_min between 1 and 1440);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.lms_assignments
    add constraint lms_assignments_max_attempts_check
    check (max_attempts between 1 and 20);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.lms_online_payment_submissions
    add constraint lms_online_payment_submissions_module_id_fkey
    foreign key (module_id) references public.lms_modules(id)
    on update cascade on delete restrict;
exception
  when duplicate_object then null;
end
$$;

create index if not exists lms_online_payment_submissions_module_id_idx
  on public.lms_online_payment_submissions(module_id);

create table if not exists public.lms_user_sessions (
  id text primary key,
  user_id text not null references public.lms_users(id) on update cascade on delete cascade,
  device_id text not null,
  token_hash text not null unique,
  user_agent text not null,
  ip_address text,
  last_active_at timestamp(3) not null default current_timestamp,
  revoked_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  constraint lms_user_sessions_user_id_device_id_key unique (user_id, device_id)
);

create index if not exists lms_user_sessions_user_id_revoked_at_last_active_at_idx
  on public.lms_user_sessions(user_id, revoked_at, last_active_at);

create table if not exists public.lms_exam_questions (
  id text primary key,
  assignment_id text not null references public.lms_assignments(id) on update cascade on delete cascade,
  prompt text not null,
  options jsonb not null,
  correct_option_key text not null,
  worked_solution text not null,
  diagram_url text,
  position integer not null,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp,
  constraint lms_exam_questions_assignment_id_position_key unique (assignment_id, position),
  constraint lms_exam_questions_position_check check (position >= 0),
  constraint lms_exam_questions_options_check check (jsonb_typeof(options) = 'array')
);

create index if not exists lms_exam_questions_assignment_id_idx
  on public.lms_exam_questions(assignment_id);

create table if not exists public.lms_exam_attempts (
  id text primary key,
  assignment_id text not null references public.lms_assignments(id) on update cascade on delete cascade,
  student_id text not null references public.lms_users(id) on update cascade on delete cascade,
  attempt_number integer not null,
  question_order jsonb not null,
  answer_order jsonb not null,
  answers jsonb,
  score double precision,
  started_at timestamp(3) not null default current_timestamp,
  submitted_at timestamp(3),
  constraint lms_exam_attempts_assignment_id_student_id_attempt_number_key
    unique (assignment_id, student_id, attempt_number),
  constraint lms_exam_attempts_attempt_number_check check (attempt_number >= 1),
  constraint lms_exam_attempts_score_check check (score is null or score between 0 and 100),
  constraint lms_exam_attempts_question_order_check check (jsonb_typeof(question_order) = 'array'),
  constraint lms_exam_attempts_answer_order_check check (jsonb_typeof(answer_order) = 'object')
);

create index if not exists lms_exam_attempts_student_id_assignment_id_submitted_at_idx
  on public.lms_exam_attempts(student_id, assignment_id, submitted_at);

create table if not exists public.lms_student_chapter_access (
  id text primary key,
  student_id text not null references public.lms_users(id) on update cascade on delete cascade,
  module_id text not null references public.lms_modules(id) on update cascade on delete cascade,
  approved_by_id text not null references public.lms_users(id) on update cascade on delete restrict,
  approved_at timestamp(3) not null default current_timestamp,
  constraint lms_student_chapter_access_student_id_module_id_key unique (student_id, module_id)
);

create index if not exists lms_student_chapter_access_module_id_idx
  on public.lms_student_chapter_access(module_id);

create table if not exists public.lms_whatsapp_dispatches (
  id text primary key,
  student_id text not null references public.lms_users(id) on update cascade on delete cascade,
  payment_id text not null references public.lms_online_payment_submissions(id) on update cascade on delete cascade,
  phone_number text not null,
  message text not null,
  status "WhatsAppDispatchStatus" not null default 'PENDING',
  attempts integer not null default 0,
  last_error text,
  sent_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp,
  constraint lms_whatsapp_dispatches_payment_id_phone_number_key unique (payment_id, phone_number),
  constraint lms_whatsapp_dispatches_attempts_check check (attempts between 0 and 20)
);

create index if not exists lms_whatsapp_dispatches_status_created_at_idx
  on public.lms_whatsapp_dispatches(status, created_at);

-- Prisma may have synchronized the modeled table shape before the tracked SQL
-- migration is applied. Add the database-only invariants independently so the
-- migration remains safe and complete in that recovery scenario.
do $$
begin
  alter table public.lms_exam_questions
    add constraint lms_exam_questions_position_check check (position >= 0);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.lms_exam_questions
    add constraint lms_exam_questions_options_check
    check (jsonb_typeof(options) = 'array');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.lms_exam_attempts
    add constraint lms_exam_attempts_attempt_number_check
    check (attempt_number >= 1);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.lms_exam_attempts
    add constraint lms_exam_attempts_score_check
    check (score is null or score between 0 and 100);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.lms_exam_attempts
    add constraint lms_exam_attempts_question_order_check
    check (jsonb_typeof(question_order) = 'array');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.lms_exam_attempts
    add constraint lms_exam_attempts_answer_order_check
    check (jsonb_typeof(answer_order) = 'object');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.lms_whatsapp_dispatches
    add constraint lms_whatsapp_dispatches_attempts_check
    check (attempts between 0 and 20);
exception
  when duplicate_object then null;
end
$$;

-- These records are server-managed through authenticated route handlers.
-- RLS is enabled as defense in depth and no Data API policy is granted.
alter table public.lms_user_sessions enable row level security;
alter table public.lms_exam_questions enable row level security;
alter table public.lms_exam_attempts enable row level security;
alter table public.lms_student_chapter_access enable row level security;
alter table public.lms_whatsapp_dispatches enable row level security;

revoke all on table public.lms_user_sessions from anon, authenticated;
revoke all on table public.lms_exam_questions from anon, authenticated;
revoke all on table public.lms_exam_attempts from anon, authenticated;
revoke all on table public.lms_student_chapter_access from anon, authenticated;
revoke all on table public.lms_whatsapp_dispatches from anon, authenticated;

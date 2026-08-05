begin;

create table public.lms_system_job_leases (
  name text primary key,
  owner_token text not null,
  locked_until timestamp(3) not null,
  updated_at timestamp(3) not null
);

create index lms_system_job_leases_locked_until_idx
  on public.lms_system_job_leases(locked_until);

alter table public.lms_system_job_leases enable row level security;
revoke all on table public.lms_system_job_leases from anon, authenticated;

create or replace function private.lock_lms_erp_role_rows()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'lms_subjects' then
    perform id
    from public.lms_users
    where id = new.teacher_id
    for update;
  elsif tg_table_name = 'lms_parent_students' then
    perform id
    from public.lms_users
    where id in (new.parent_id, new.student_id)
    order by id
    for update;
  elsif tg_table_name = 'lms_student_subscriptions' then
    perform id
    from public.lms_users
    where id = new.student_id or id = new.approved_by_id
    order by id
    for update;
  elsif tg_table_name = 'lms_usd_manual_ledger' then
    perform id
    from public.lms_users
    where id in (new.student_id, new.created_by_id, new.approved_by_id)
    order by id
    for update;
  else
    perform id
    from public.lms_users
    where id = new.student_id
    for update;
  end if;

  return new;
end;
$$;

revoke all on function private.lock_lms_erp_role_rows()
  from public, anon, authenticated;

create trigger lock_lms_subject_teacher_role
before insert or update on public.lms_subjects
for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_enrollment_student_role
before insert or update on public.lms_enrollments
for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_progress_student_role
before insert or update on public.lms_lesson_progress
for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_submission_student_role
before insert or update on public.lms_assignment_submissions
for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_health_student_role
before insert or update on public.lms_student_health_scores
for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_parent_student_roles
before insert or update on public.lms_parent_students
for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_subscription_roles
before insert or update on public.lms_student_subscriptions
for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_payment_roles
before insert or update on public.lms_usd_manual_ledger
for each row execute function private.lock_lms_erp_role_rows();

commit;

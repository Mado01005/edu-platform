create or replace function private.validate_lms_user_role_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role::text = 'TEACHER'
    and (new.role::text <> 'TEACHER' or new.status::text <> 'ACTIVE')
    and (
      exists (select 1 from public.lms_subjects where teacher_id = old.id)
      or exists (select 1 from public.lms_courses where teacher_id = old.id)
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
      or exists (select 1 from public.lms_digital_attendance where student_id = old.id)
      or exists (select 1 from public.lms_online_payment_submissions where student_id = old.id)
    ) then
      raise exception 'Remove this student''s role-bound records before changing roles.';
    end if;

    if old.role::text = 'PARENT' and (
      exists (select 1 from public.lms_parent_students where parent_id = old.id)
      or exists (select 1 from public.lms_parent_portal_credentials where parent_id = old.id)
      or exists (select 1 from public.lms_parent_portal_sessions where parent_id = old.id)
    ) then
      raise exception 'Remove this parent''s portal records and student links before changing roles.';
    end if;

    if old.role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING') and (
      exists (select 1 from public.lms_payment_channels where updated_by_id = old.id)
      or exists (select 1 from public.lms_online_payment_submissions where reviewed_by_id = old.id)
    ) then
      raise exception 'Online accounting audit records require this accounting role.';
    end if;

    if new.role::text <> 'STUDENT' then
      new.grade_level := null;
    end if;
  end if;

  return new;
end;
$$;

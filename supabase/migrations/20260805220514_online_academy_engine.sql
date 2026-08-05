begin;

create type public."AttendanceType" as enum ('LIVE_ZOOM', 'VIDEO_LESSON', 'ONLINE_QUIZ');
create type public."AccessCodeStatus" as enum ('ACTIVE', 'REDEEMED', 'REVOKED');
create type public."OnlinePaymentMethod" as enum ('INSTAPAY', 'VODAFONE_CASH', 'ONLINE_CARD', 'USD_WIRE', 'PAYPAL');

alter table public.lms_courses
  add column price_egp numeric(12, 2) not null default 0,
  add column price_usd numeric(12, 2) not null default 0,
  add constraint lms_courses_prices_check check (
    price_egp between 0 and 999999999.99
    and price_usd between 0 and 999999999.99
  );

alter table public.lms_assignment_submissions
  add column teacher_feedback text,
  add constraint lms_assignment_submissions_feedback_length_check
    check (teacher_feedback is null or char_length(teacher_feedback) <= 10000);

create table public.lms_digital_attendance (
  id text primary key,
  student_id text not null,
  course_id text not null,
  lesson_id text,
  zoom_session_id text,
  type public."AttendanceType" not null default 'VIDEO_LESSON',
  joined_at timestamp(3) not null default current_timestamp,
  duration_min integer not null default 0,
  updated_at timestamp(3) not null,
  constraint lms_digital_attendance_student_id_fkey
    foreign key (student_id) references public.lms_users(id)
    on delete cascade on update cascade,
  constraint lms_digital_attendance_course_id_fkey
    foreign key (course_id) references public.lms_courses(id)
    on delete cascade on update cascade,
  constraint lms_digital_attendance_lesson_id_fkey
    foreign key (lesson_id) references public.lms_lessons(id)
    on delete cascade on update cascade,
  constraint lms_digital_attendance_zoom_session_id_fkey
    foreign key (zoom_session_id) references public.lms_zoom_sessions(id)
    on delete cascade on update cascade,
  constraint lms_digital_attendance_duration_check
    check (duration_min between 0 and 10000),
  constraint lms_digital_attendance_target_check check (
    (type = 'LIVE_ZOOM' and zoom_session_id is not null and lesson_id is null)
    or (type = 'VIDEO_LESSON' and lesson_id is not null and zoom_session_id is null)
    or (type = 'ONLINE_QUIZ' and lesson_id is null and zoom_session_id is null)
  ),
  constraint lms_digital_attendance_student_lesson_type_key
    unique (student_id, lesson_id, type),
  constraint lms_digital_attendance_student_zoom_type_key
    unique (student_id, zoom_session_id, type)
);

create table public.lms_digital_access_codes (
  id text primary key,
  code_hash text not null unique,
  code_last_four text not null,
  batch_id text not null,
  course_id text,
  grade_level public."GradeLevel",
  status public."AccessCodeStatus" not null default 'ACTIVE',
  created_by_id text not null,
  redeemed_by_id text,
  redeemed_at timestamp(3),
  expires_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  constraint lms_digital_access_codes_course_id_fkey
    foreign key (course_id) references public.lms_courses(id)
    on delete restrict on update cascade,
  constraint lms_digital_access_codes_created_by_id_fkey
    foreign key (created_by_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_digital_access_codes_redeemed_by_id_fkey
    foreign key (redeemed_by_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_digital_access_codes_hash_check
    check (code_hash ~ '^[a-f0-9]{64}$'),
  constraint lms_digital_access_codes_last_four_check
    check (code_last_four ~ '^\d{4}$'),
  constraint lms_digital_access_codes_target_check
    check ((course_id is not null)::integer + (grade_level is not null)::integer = 1),
  constraint lms_digital_access_codes_redemption_state_check check (
    (status = 'ACTIVE' and redeemed_by_id is null and redeemed_at is null)
    or (status = 'REDEEMED' and redeemed_by_id is not null and redeemed_at is not null)
    or (status = 'REVOKED' and ((redeemed_by_id is null and redeemed_at is null) or (redeemed_by_id is not null and redeemed_at is not null)))
  )
);

create table public.lms_payment_channels (
  id text primary key,
  method public."OnlinePaymentMethod" not null unique,
  currency public."PaymentCurrency" not null,
  display_name text not null,
  account_value text not null,
  instructions text,
  is_active boolean not null default false,
  updated_by_id text not null,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null,
  constraint lms_payment_channels_updated_by_id_fkey
    foreign key (updated_by_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_payment_channels_text_check check (
    char_length(btrim(display_name)) between 1 and 80
    and char_length(btrim(account_value)) between 1 and 200
    and (instructions is null or char_length(instructions) <= 1000)
  ),
  constraint lms_payment_channels_currency_check check (
    (method in ('INSTAPAY', 'VODAFONE_CASH', 'ONLINE_CARD') and currency = 'EGP')
    or (method in ('USD_WIRE', 'PAYPAL') and currency = 'USD')
  )
);

create table public.lms_online_payment_submissions (
  id text primary key,
  student_id text not null,
  course_id text not null,
  currency public."PaymentCurrency" not null,
  amount numeric(12, 2) not null,
  payment_method public."OnlinePaymentMethod" not null,
  receipt_object_key text not null unique,
  receipt_content_type text not null,
  receipt_size_bytes integer not null,
  transaction_reference text,
  invoice_number text unique,
  status public."PaymentStatus" not null default 'PENDING',
  rejection_reason text,
  reviewed_by_id text,
  reviewed_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null,
  constraint lms_online_payments_student_id_fkey
    foreign key (student_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_online_payments_course_id_fkey
    foreign key (course_id) references public.lms_courses(id)
    on delete restrict on update cascade,
  constraint lms_online_payments_reviewed_by_id_fkey
    foreign key (reviewed_by_id) references public.lms_users(id)
    on delete restrict on update cascade,
  constraint lms_online_payments_amount_check
    check (amount between 0.01 and 999999999.99),
  constraint lms_online_payments_method_currency_check check (
    (payment_method in ('INSTAPAY', 'VODAFONE_CASH', 'ONLINE_CARD') and currency = 'EGP')
    or (payment_method in ('USD_WIRE', 'PAYPAL') and currency = 'USD')
  ),
  constraint lms_online_payments_receipt_check check (
    receipt_object_key ~ '^lms/receipts/[^/]+/[^/]+/[^/]+$'
    and receipt_content_type in ('image/jpeg', 'image/png', 'image/webp')
    and receipt_size_bytes between 1 and 8388608
  ),
  constraint lms_online_payments_text_length_check check (
    (transaction_reference is null or char_length(transaction_reference) <= 120)
    and (rejection_reason is null or char_length(rejection_reason) <= 500)
  ),
  constraint lms_online_payments_review_state_check check (
    (status = 'PENDING' and reviewed_by_id is null and reviewed_at is null and invoice_number is null and rejection_reason is null)
    or (status = 'APPROVED' and reviewed_by_id is not null and reviewed_at is not null and invoice_number is not null and rejection_reason is null)
    or (status = 'REJECTED' and reviewed_by_id is not null and reviewed_at is not null and invoice_number is null and rejection_reason is not null)
  )
);

create table public.lms_parent_portal_credentials (
  parent_id text primary key,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamp(3),
  last_login_at timestamp(3),
  updated_at timestamp(3) not null,
  constraint lms_parent_portal_credentials_parent_id_fkey
    foreign key (parent_id) references public.lms_users(id)
    on delete cascade on update cascade,
  constraint lms_parent_portal_credentials_pin_hash_check
    check (pin_hash ~ '^[a-f0-9]{32}:[a-f0-9]{64}$'),
  constraint lms_parent_portal_credentials_attempts_check
    check (failed_attempts between 0 and 4)
);

create table public.lms_parent_portal_sessions (
  id text primary key,
  parent_id text not null,
  token_hash text not null unique,
  expires_at timestamp(3) not null,
  last_seen_at timestamp(3) not null default current_timestamp,
  revoked_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  constraint lms_parent_portal_sessions_parent_id_fkey
    foreign key (parent_id) references public.lms_users(id)
    on delete cascade on update cascade,
  constraint lms_parent_portal_sessions_token_hash_check
    check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint lms_parent_portal_sessions_dates_check
    check (expires_at > created_at and (revoked_at is null or revoked_at >= created_at))
);

create index lms_digital_attendance_student_joined_at_idx on public.lms_digital_attendance(student_id, joined_at);
create index lms_digital_attendance_course_type_joined_at_idx on public.lms_digital_attendance(course_id, type, joined_at);
create index lms_digital_access_codes_batch_id_idx on public.lms_digital_access_codes(batch_id);
create index lms_digital_access_codes_status_created_at_idx on public.lms_digital_access_codes(status, created_at);
create index lms_digital_access_codes_course_id_idx on public.lms_digital_access_codes(course_id);
create index lms_digital_access_codes_grade_level_idx on public.lms_digital_access_codes(grade_level);
create index lms_digital_access_codes_redeemed_by_id_idx on public.lms_digital_access_codes(redeemed_by_id);
create index lms_payment_channels_active_currency_idx on public.lms_payment_channels(is_active, currency);
create index lms_payment_channels_updated_by_id_idx on public.lms_payment_channels(updated_by_id);
create index lms_online_payments_status_created_at_idx on public.lms_online_payment_submissions(status, created_at);
create index lms_online_payments_student_created_at_idx on public.lms_online_payment_submissions(student_id, created_at);
create index lms_online_payments_course_id_idx on public.lms_online_payment_submissions(course_id);
create index lms_online_payments_reviewed_by_id_idx on public.lms_online_payment_submissions(reviewed_by_id);
create unique index lms_online_payments_one_pending_per_course_idx
  on public.lms_online_payment_submissions(student_id, course_id)
  where status = 'PENDING';
create index lms_parent_portal_credentials_locked_until_idx on public.lms_parent_portal_credentials(locked_until);
create index lms_parent_portal_sessions_parent_expires_idx on public.lms_parent_portal_sessions(parent_id, expires_at);
create index lms_parent_portal_sessions_expires_at_idx on public.lms_parent_portal_sessions(expires_at);

create or replace function private.validate_lms_online_relations()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'lms_digital_attendance' then
    if not exists (select 1 from public.lms_users where id = new.student_id and role::text = 'STUDENT' and status::text = 'ACTIVE') then
      raise exception 'Digital attendance requires an active STUDENT.';
    end if;
    if new.lesson_id is not null and not exists (
      select 1 from public.lms_lessons l join public.lms_modules m on m.id = l.module_id
      where l.id = new.lesson_id and m.course_id = new.course_id
    ) then raise exception 'Attendance lesson must belong to its course.';
    end if;
    if new.zoom_session_id is not null and not exists (
      select 1 from public.lms_zoom_sessions where id = new.zoom_session_id and course_id = new.course_id
    ) then raise exception 'Attendance live class must belong to its course.';
    end if;
  elsif tg_table_name = 'lms_digital_access_codes' then
    if not exists (select 1 from public.lms_users where id = new.created_by_id and role::text in ('SUPER_ADMIN', 'ADMIN') and status::text = 'ACTIVE') then
      raise exception 'Digital codes require an active administrator.';
    end if;
    if new.redeemed_by_id is not null and not exists (select 1 from public.lms_users where id = new.redeemed_by_id and role::text = 'STUDENT' and status::text = 'ACTIVE') then
      raise exception 'Digital codes may only be redeemed by active STUDENT accounts.';
    end if;
  elsif tg_table_name = 'lms_payment_channels' then
    if not exists (select 1 from public.lms_users where id = new.updated_by_id and role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING') and status::text = 'ACTIVE') then
      raise exception 'Payment channels require an active accounting operator.';
    end if;
  elsif tg_table_name = 'lms_online_payment_submissions' then
    if not exists (select 1 from public.lms_users where id = new.student_id and role::text = 'STUDENT' and status::text = 'ACTIVE') then
      raise exception 'Online payments require an active STUDENT.';
    end if;
    if new.reviewed_by_id is not null and not exists (select 1 from public.lms_users where id = new.reviewed_by_id and role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING') and status::text = 'ACTIVE') then
      raise exception 'Online payment review requires an active accounting operator.';
    end if;
  elsif tg_table_name in ('lms_parent_portal_credentials', 'lms_parent_portal_sessions') then
    if not exists (select 1 from public.lms_users where id = new.parent_id and role::text = 'PARENT' and status::text = 'ACTIVE') then
      raise exception 'Parent portal records require an active PARENT account.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_lms_online_relations() from public, anon, authenticated;

create trigger validate_lms_digital_attendance before insert or update on public.lms_digital_attendance for each row execute function private.validate_lms_online_relations();
create trigger validate_lms_digital_access_codes before insert or update on public.lms_digital_access_codes for each row execute function private.validate_lms_online_relations();
create trigger validate_lms_payment_channels before insert or update on public.lms_payment_channels for each row execute function private.validate_lms_online_relations();
create trigger validate_lms_online_payments before insert or update on public.lms_online_payment_submissions for each row execute function private.validate_lms_online_relations();
create trigger validate_lms_parent_credentials before insert or update on public.lms_parent_portal_credentials for each row execute function private.validate_lms_online_relations();
create trigger validate_lms_parent_sessions before insert or update on public.lms_parent_portal_sessions for each row execute function private.validate_lms_online_relations();

create or replace function private.lock_lms_erp_role_rows()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'lms_subjects' then
    perform id from public.lms_users where id = new.teacher_id for update;
  elsif tg_table_name = 'lms_parent_students' then
    perform id from public.lms_users where id in (new.parent_id, new.student_id) order by id for update;
  elsif tg_table_name = 'lms_student_subscriptions' then
    perform id from public.lms_users where id = new.student_id or id = new.approved_by_id order by id for update;
  elsif tg_table_name = 'lms_usd_manual_ledger' then
    perform id from public.lms_users where id in (new.student_id, new.created_by_id, new.approved_by_id) order by id for update;
  elsif tg_table_name = 'lms_digital_access_codes' then
    perform id from public.lms_users where id in (new.created_by_id, new.redeemed_by_id) order by id for update;
  elsif tg_table_name = 'lms_payment_channels' then
    perform id from public.lms_users where id = new.updated_by_id for update;
  elsif tg_table_name = 'lms_online_payment_submissions' then
    perform id from public.lms_users where id = new.student_id or id = new.reviewed_by_id order by id for update;
  elsif tg_table_name in ('lms_parent_portal_credentials', 'lms_parent_portal_sessions') then
    perform id from public.lms_users where id = new.parent_id for update;
  else
    perform id from public.lms_users where id = new.student_id for update;
  end if;
  return new;
end;
$$;

create trigger lock_lms_digital_attendance_role before insert or update on public.lms_digital_attendance for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_digital_access_code_roles before insert or update on public.lms_digital_access_codes for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_payment_channel_role before insert or update on public.lms_payment_channels for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_online_payment_roles before insert or update on public.lms_online_payment_submissions for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_parent_credential_role before insert or update on public.lms_parent_portal_credentials for each row execute function private.lock_lms_erp_role_rows();
create trigger lock_lms_parent_session_role before insert or update on public.lms_parent_portal_sessions for each row execute function private.lock_lms_erp_role_rows();

create or replace function private.validate_lms_user_role_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.role::text = 'TEACHER'
    and (new.role::text <> 'TEACHER' or new.status::text <> 'ACTIVE')
    and (exists (select 1 from public.lms_subjects where teacher_id = old.id) or exists (select 1 from public.lms_courses where teacher_id = old.id))
  then raise exception 'Reassign this teacher''s subjects and courses first.';
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
      or exists (select 1 from public.lms_digital_access_codes where redeemed_by_id = old.id)
      or exists (select 1 from public.lms_online_payment_submissions where student_id = old.id)
    ) then raise exception 'Remove this student''s role-bound records before changing roles.';
    end if;

    if old.role::text = 'PARENT' and (
      exists (select 1 from public.lms_parent_students where parent_id = old.id)
      or exists (select 1 from public.lms_parent_portal_credentials where parent_id = old.id)
      or exists (select 1 from public.lms_parent_portal_sessions where parent_id = old.id)
    ) then raise exception 'Remove this parent''s portal records and student links before changing roles.';
    end if;

    if old.role::text in ('SUPER_ADMIN', 'ADMIN')
      and exists (select 1 from public.lms_digital_access_codes where created_by_id = old.id)
    then raise exception 'Digital code audit records require this administrator role.';
    end if;

    if old.role::text in ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTING') and (
      exists (select 1 from public.lms_payment_channels where updated_by_id = old.id)
      or exists (select 1 from public.lms_online_payment_submissions where reviewed_by_id = old.id)
    ) then raise exception 'Online accounting audit records require this accounting role.';
    end if;

    if new.role::text <> 'STUDENT' then new.grade_level := null;
    end if;
  end if;
  return new;
end;
$$;

alter table public.lms_digital_attendance enable row level security;
alter table public.lms_digital_access_codes enable row level security;
alter table public.lms_payment_channels enable row level security;
alter table public.lms_online_payment_submissions enable row level security;
alter table public.lms_parent_portal_credentials enable row level security;
alter table public.lms_parent_portal_sessions enable row level security;

revoke all on table
  public.lms_digital_attendance,
  public.lms_digital_access_codes,
  public.lms_payment_channels,
  public.lms_online_payment_submissions,
  public.lms_parent_portal_credentials,
  public.lms_parent_portal_sessions
from anon, authenticated;

commit;

drop policy if exists "teachers manage course modules" on public.lms_modules;

create policy "teachers insert course modules"
on public.lms_modules for insert to authenticated
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

create policy "teachers update course modules"
on public.lms_modules for update to authenticated
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

create policy "teachers delete course modules"
on public.lms_modules for delete to authenticated
using (
  exists (
    select 1 from public.lms_courses c
    where c.id = course_id
      and (
        c.teacher_id = (select private.current_lms_user_id())
        or (select private.current_lms_role()) = 'ADMIN'
      )
  )
);

drop policy if exists "teachers manage course lessons" on public.lms_lessons;

create policy "teachers insert course lessons"
on public.lms_lessons for insert to authenticated
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

create policy "teachers update course lessons"
on public.lms_lessons for update to authenticated
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

create policy "teachers delete course lessons"
on public.lms_lessons for delete to authenticated
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
);

drop policy if exists "teachers manage zoom sessions" on public.lms_zoom_sessions;

create policy "teachers insert zoom sessions"
on public.lms_zoom_sessions for insert to authenticated
with check (
  (
    teacher_id = (select private.current_lms_user_id())
    and exists (
      select 1 from public.lms_courses c
      where c.id = course_id and c.teacher_id = teacher_id
    )
  )
  or (select private.current_lms_role()) = 'ADMIN'
);

create policy "teachers update zoom sessions"
on public.lms_zoom_sessions for update to authenticated
using (
  teacher_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'
)
with check (
  (
    teacher_id = (select private.current_lms_user_id())
    and exists (
      select 1 from public.lms_courses c
      where c.id = course_id and c.teacher_id = teacher_id
    )
  )
  or (select private.current_lms_role()) = 'ADMIN'
);

create policy "teachers delete zoom sessions"
on public.lms_zoom_sessions for delete to authenticated
using (
  teacher_id = (select private.current_lms_user_id())
  or (select private.current_lms_role()) = 'ADMIN'
);

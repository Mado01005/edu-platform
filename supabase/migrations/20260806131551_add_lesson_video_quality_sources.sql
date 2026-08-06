begin;

alter table public.lms_lessons
  add column if not exists video_url_360 text,
  add column if not exists video_url_480 text,
  add column if not exists video_url_720 text,
  add column if not exists video_url_1080 text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lms_lessons_video_quality_urls_check'
      and conrelid = 'public.lms_lessons'::regclass
  ) then
    alter table public.lms_lessons
      add constraint lms_lessons_video_quality_urls_check check (
        (video_url_360 is null or video_url_360 ~ '^https://')
        and (video_url_480 is null or video_url_480 ~ '^https://')
        and (video_url_720 is null or video_url_720 ~ '^https://')
        and (video_url_1080 is null or video_url_1080 ~ '^https://')
      );
  end if;
end
$$;

alter table public.lms_users
  drop constraint if exists lms_users_video_quality_valid,
  add constraint lms_users_video_quality_valid check (
    default_video_quality in ('AUTO', '1080P', '720P', '480P', '360P')
  );

comment on column public.lms_lessons.video_url_360 is
  'Optional teacher-supplied 360p data-saver rendition.';
comment on column public.lms_lessons.video_url_480 is
  'Optional teacher-supplied 480p standard-definition rendition.';
comment on column public.lms_lessons.video_url_720 is
  'Optional teacher-supplied 720p high-definition rendition.';
comment on column public.lms_lessons.video_url_1080 is
  'Optional teacher-supplied 1080p high-definition rendition.';

commit;

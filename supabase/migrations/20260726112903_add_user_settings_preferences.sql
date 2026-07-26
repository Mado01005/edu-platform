alter table public.lms_users
  add column headline text,
  add column bio text,
  add column avatar_url text,
  add column timezone text not null default 'UTC',
  add column default_playback_speed double precision not null default 1.0,
  add column default_video_quality text not null default 'AUTO',
  add column auto_play_next boolean not null default true,
  add column notify_zoom_classes boolean not null default true,
  add column notify_announcements boolean not null default true,
  add column notify_discussions boolean not null default true;

alter table public.lms_users
  add constraint lms_users_headline_length
    check (headline is null or char_length(headline) <= 120),
  add constraint lms_users_bio_length
    check (bio is null or char_length(bio) <= 1000),
  add constraint lms_users_avatar_url_length
    check (avatar_url is null or char_length(avatar_url) <= 2048),
  add constraint lms_users_timezone_length
    check (char_length(timezone) between 1 and 100),
  add constraint lms_users_playback_speed_valid
    check (default_playback_speed in (1.0, 1.25, 1.5, 2.0)),
  add constraint lms_users_video_quality_valid
    check (default_video_quality in ('AUTO', '1080P', '720P', '480P'));

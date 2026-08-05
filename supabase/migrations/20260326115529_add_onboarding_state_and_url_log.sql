-- Add is_onboarded flag to user_roles for robust status checking
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;

-- Add missing url column to activity_logs to resolve 400 errors in logging API
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS url TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_onboarding ON public.activity_logs(user_email, action) WHERE action = 'Completed Student Onboarding';
;

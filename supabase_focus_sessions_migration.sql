-- Feature: Binary Beats (Focus Sessions)
-- This migration script creates the schema and RLS policies for tracking student focus levels.

-- 1. Create the ENUM type for session status
CREATE TYPE focus_status AS ENUM ('completed', 'interrupted');

-- 2. Create the focus_sessions table
CREATE TABLE focus_sessions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- NOTE ON FOREIGN KEY: 
    -- If your EduPortal architecture utilizes NextAuth and maps users to a custom table (e.g. `user_roles`),
    -- change `auth.users(id)` to `public.user_roles(id)`. Standard Supabase native setups use `auth.users(id)`.
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    lesson_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    
    duration_minutes INT NOT NULL,
    status focus_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Students can ONLY INSERT their own records
CREATE POLICY "Users can insert own focus records"
    ON focus_sessions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- 5. RLS Policy: Students can ONLY SELECT their own records
CREATE POLICY "Users can view own focus records"
    ON focus_sessions
    FOR SELECT
    USING (user_id = auth.uid());

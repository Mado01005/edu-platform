-- Feature: The Forge (Live Technical Snippets)
-- This migration script creates the schema, realtime configuration, and RLS policies.

-- 1. Create the snippets table
CREATE TABLE snippets (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    
    -- NOTE ON FOREIGN KEY: 
    -- Change `auth.users(id)` to `public.user_roles(id)` if NextAuth identity mapping is used for user IDs.
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    language_type TEXT NOT NULL DEFAULT 'plaintext',
    raw_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Realtime Broadcasting
-- This is critical for the WebSocket listeners to receive insert events
BEGIN;
-- Drop from publication if it exists to avoid errors
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'snippets'
  ) THEN 
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE snippets;';
  END IF;
END $$;
-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE snippets;
COMMIT;


-- 3. Row Level Security Configuration
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Anyone authenticated can view snippets
CREATE POLICY "Anyone authenticated can read snippets"
    ON snippets
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 5. RLS Policy: Students can ONLY INSERT their own snippets
CREATE POLICY "Users can insert own snippets"
    ON snippets
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

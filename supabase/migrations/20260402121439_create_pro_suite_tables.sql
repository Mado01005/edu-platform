-- 1. Add internal_notes to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 2. Create user_snippets table
CREATE TABLE IF NOT EXISTS user_snippets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  lesson_slug TEXT NOT NULL,
  subject_slug TEXT NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email, achievement_id)
);

-- Enable RLS for snippets and achievements
ALTER TABLE user_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Add basic policies (allowing users to read/write their own data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own snippets') THEN
        CREATE POLICY "Users can manage their own snippets" ON user_snippets
        FOR ALL USING (auth.jwt()->>'email' = user_email);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own achievements') THEN
        CREATE POLICY "Users can view their own achievements" ON user_achievements
        FOR SELECT USING (auth.jwt()->>'email' = user_email);
    END IF;
END $$;
;

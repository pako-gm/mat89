-- Add last_sign_in_at column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_sign_in_at
ON user_profiles(last_sign_in_at);

-- Optionally sync historical data from auth.users
-- This updates existing records with their last sign in time from Supabase Auth
UPDATE user_profiles up
SET last_sign_in_at = au.last_sign_in_at
FROM auth.users au
WHERE up.user_id = au.id
AND up.last_sign_in_at IS NULL
AND au.last_sign_in_at IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.last_sign_in_at IS 'Timestamp of the user''s last successful login';

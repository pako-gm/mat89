/*
  # Password Reset Tracking System

  1. New Schema
    - Create app_auth schema for password reset functionality
    - Grant necessary permissions

  2. New Tables
    - password_reset_attempts
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - email (text, not null)
      - ip_address (inet)
      - user_agent (text)
      - created_at (timestamptz)
      - status (text: 'pending', 'used', 'expired')

  3. New Functions
    - log_password_reset_attempt: Records attempt details
    - mark_reset_token_used: Updates token status to 'used'
    - purge_expired_reset_tokens: Updates old tokens to 'expired'
*/

-- Create a schema for password reset attempts if it doesn't exist
CREATE SCHEMA IF NOT EXISTS app_auth;

-- Grant usage on the schema to the authenticator role
GRANT USAGE ON SCHEMA app_auth TO authenticator;

-- Set the search path to include the new schema
ALTER DATABASE postgres SET search_path TO "$user", public, app_auth;

-- Create a table to track password reset attempts in the new schema
CREATE TABLE IF NOT EXISTS app_auth.password_reset_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'pending' NOT NULL, -- 'pending', 'used', 'expired'
  CONSTRAINT valid_status CHECK (status IN ('pending', 'used', 'expired'))
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_user_id ON app_auth.password_reset_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email ON app_auth.password_reset_attempts(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_created_at ON app_auth.password_reset_attempts(created_at);

-- Function to log password reset attempts
-- This can be added to Supabase edge functions if needed
CREATE OR REPLACE FUNCTION app_auth.log_password_reset_attempt(
  p_email text,
  p_ip_address inet,
  p_user_agent text
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_attempt_id uuid;
BEGIN
  -- Get user ID if email exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  -- Record the attempt regardless of whether the email exists
  INSERT INTO app_auth.password_reset_attempts (
    user_id, email, ip_address, user_agent
  ) VALUES (
    v_user_id, p_email, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_attempt_id;
  
  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark a reset token as used
CREATE OR REPLACE FUNCTION app_auth.mark_reset_token_used(p_user_id uuid) RETURNS void AS $$
BEGIN
  UPDATE app_auth.password_reset_attempts
  SET status = 'used'
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND created_at > now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purge expired tokens
CREATE OR REPLACE FUNCTION app_auth.purge_expired_reset_tokens() RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  -- Mark old pending tokens as expired
  UPDATE app_auth.password_reset_attempts
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at <= now() - interval '24 hours';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired tokens
-- This would normally be done using a cron job or Supabase function
COMMENT ON FUNCTION app_auth.purge_expired_reset_tokens() IS 
  'Run this function regularly to clean up expired password reset tokens';
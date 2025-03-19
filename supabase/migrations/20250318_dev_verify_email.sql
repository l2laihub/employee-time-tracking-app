-- This migration adds a development-only function to verify user emails
-- WARNING: This should never be used in production environments

-- Create a function to verify a user's email in development mode
CREATE OR REPLACE FUNCTION dev_verify_user_email(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow this function to be called in development environments
  -- This is a safety check to prevent accidental use in production
  IF current_setting('app.environment', true) != 'development' THEN
    RAISE EXCEPTION 'This function can only be used in development environments';
  END IF;

  -- Update the user's email_confirmed_at timestamp
  UPDATE auth.users
  SET email_confirmed_at = now(),
      updated_at = now()
  WHERE id = user_id;
END;
$$;

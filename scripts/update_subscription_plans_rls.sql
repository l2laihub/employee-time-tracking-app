-- Drop the existing RLS policy
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;

-- Create a new, more permissive RLS policy
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (true);  -- Allow anyone to view any subscription plan
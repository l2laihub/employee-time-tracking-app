-- Implement Subscription System Changes
-- This script will:
-- 1. Create the subscriptions table
-- 2. Migrate data from the organizations table to the subscriptions table
-- 3. Remove the Stripe-related fields from the organizations table

-- Step 1: Create the subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for the subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to view subscriptions for organizations they belong to
CREATE POLICY "Users can view subscriptions for their organizations" 
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Allow organization admins to update subscriptions
CREATE POLICY "Admins can update subscriptions for their organizations" 
  ON subscriptions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow organization admins to insert subscriptions
CREATE POLICY "Admins can insert subscriptions for their organizations" 
  ON subscriptions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Step 2: Migrate data from organizations table to subscriptions table
DO $$
DECLARE
    plan_type_exists BOOLEAN;
    free_plan_id UUID;
BEGIN
    -- Check if plan_type column exists in organizations table
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'organizations'
        AND column_name = 'plan_type'
    ) INTO plan_type_exists;
    
    -- Get the free plan ID
    SELECT id INTO free_plan_id FROM subscription_plans WHERE type = 'free' LIMIT 1;
    
    IF plan_type_exists THEN
        -- If plan_type exists, use it to join with subscription_plans
        INSERT INTO subscriptions (
          organization_id,
          plan_id,
          status,
          billing_cycle
        )
        SELECT
          o.id AS organization_id,
          sp.id AS plan_id,
          'active' AS status,
          'monthly' AS billing_cycle
        FROM
          organizations o
        JOIN
          subscription_plans sp ON o.plan_type = sp.type
        WHERE
          o.id IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
    ELSE
        -- If plan_type doesn't exist, assign all organizations to the free plan
        INSERT INTO subscriptions (
          organization_id,
          plan_id,
          status,
          billing_cycle
        )
        SELECT
          o.id AS organization_id,
          free_plan_id AS plan_id,
          'active' AS status,
          'monthly' AS billing_cycle
        FROM
          organizations o
        WHERE
          o.id IS NOT NULL
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Create a function to get the current subscription for an organization
CREATE OR REPLACE FUNCTION get_organization_subscription(org_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_id UUID,
  plan_name TEXT,
  plan_type TEXT,
  status TEXT,
  billing_cycle TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS subscription_id,
    s.plan_id,
    p.name AS plan_name,
    p.type AS plan_type,
    s.status,
    s.billing_cycle,
    s.current_period_end
  FROM 
    subscriptions s
  JOIN 
    subscription_plans p ON s.plan_id = p.id
  WHERE 
    s.organization_id = org_id
  ORDER BY 
    s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Remove Stripe-specific fields from organizations table
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check for stripe_customer_id column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'stripe_customer_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN stripe_customer_id;
        RAISE NOTICE 'Dropped stripe_customer_id column';
    ELSE
        RAISE NOTICE 'stripe_customer_id column does not exist';
    END IF;

    -- Check for stripe_subscription_id column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'stripe_subscription_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN stripe_subscription_id;
        RAISE NOTICE 'Dropped stripe_subscription_id column';
    ELSE
        RAISE NOTICE 'stripe_subscription_id column does not exist';
    END IF;

    -- Check for plan_type column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'plan_type'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN plan_type;
        RAISE NOTICE 'Dropped plan_type column';
    ELSE
        RAISE NOTICE 'plan_type column does not exist';
    END IF;

    -- Check for subscription_status column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'subscription_status'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN subscription_status;
        RAISE NOTICE 'Dropped subscription_status column';
    ELSE
        RAISE NOTICE 'subscription_status column does not exist';
    END IF;

    -- Check for billing_cycle column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'billing_cycle'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN billing_cycle;
        RAISE NOTICE 'Dropped billing_cycle column';
    ELSE
        RAISE NOTICE 'billing_cycle column does not exist';
    END IF;

    -- Check for subscription_start_date column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'subscription_start_date'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN subscription_start_date;
        RAISE NOTICE 'Dropped subscription_start_date column';
    ELSE
        RAISE NOTICE 'subscription_start_date column does not exist';
    END IF;

    -- Check for subscription_end_date column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'subscription_end_date'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN subscription_end_date;
        RAISE NOTICE 'Dropped subscription_end_date column';
    ELSE
        RAISE NOTICE 'subscription_end_date column does not exist';
    END IF;

    -- Check for trial_end_date column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'trial_end_date'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN trial_end_date;
        RAISE NOTICE 'Dropped trial_end_date column';
    ELSE
        RAISE NOTICE 'trial_end_date column does not exist';
    END IF;

    -- Check for subscription_plan_id column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'subscription_plan_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN subscription_plan_id;
        RAISE NOTICE 'Dropped subscription_plan_id column';
    ELSE
        RAISE NOTICE 'subscription_plan_id column does not exist';
    END IF;

    -- Check for payment_failed_count column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'payment_failed_count'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN payment_failed_count;
        RAISE NOTICE 'Dropped payment_failed_count column';
    ELSE
        RAISE NOTICE 'payment_failed_count column does not exist';
    END IF;

    -- Check for last_payment_date column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'last_payment_date'
    ) INTO column_exists;
    
    IF column_exists THEN
        ALTER TABLE organizations DROP COLUMN last_payment_date;
        RAISE NOTICE 'Dropped last_payment_date column';
    ELSE
        RAISE NOTICE 'last_payment_date column does not exist';
    END IF;
END $$;
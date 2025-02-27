# Subscription System Database Changes

This document outlines the SQL scripts needed to implement the database changes proposed in the subscription system simplification plan.

## Create Subscriptions Table

```sql
-- Create a dedicated subscriptions table
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
```

## Migrate Data from Organizations Table

```sql
-- Migrate data from organizations table to subscriptions table
INSERT INTO subscriptions (
  organization_id,
  plan_id,
  status,
  billing_cycle,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_start,
  current_period_end
)
SELECT 
  o.id AS organization_id,
  sp.id AS plan_id,
  COALESCE(o.subscription_status, 'active') AS status,
  COALESCE(o.billing_cycle, 'monthly') AS billing_cycle,
  o.stripe_customer_id,
  o.stripe_subscription_id,
  o.subscription_start_date AS current_period_start,
  o.subscription_end_date AS current_period_end
FROM 
  organizations o
JOIN 
  subscription_plans sp ON o.plan_type = sp.type
WHERE 
  o.id IS NOT NULL;
```

## Update Organizations Table

```sql
-- Remove Stripe-specific fields from organizations table
ALTER TABLE organizations 
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS plan_type,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS billing_cycle,
  DROP COLUMN IF EXISTS subscription_start_date,
  DROP COLUMN IF EXISTS subscription_end_date,
  DROP COLUMN IF EXISTS trial_end_date,
  DROP COLUMN IF EXISTS subscription_plan_id,
  DROP COLUMN IF EXISTS payment_failed_count,
  DROP COLUMN IF EXISTS last_payment_date;
```

## Update RLS Policies for Organizations Table

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization members can view their organization" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;

-- Create new policies
-- Allow organization members to view their organization
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Allow organization admins to update their organization
CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## Create Function to Get Current Subscription

```sql
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
```

## Implementation Steps

1. Run the "Create Subscriptions Table" script to create the new table
2. Run the "Migrate Data from Organizations Table" script to transfer existing data
3. Run the "Update Organizations Table" script to remove redundant fields
4. Run the "Update RLS Policies for Organizations Table" script to fix access issues
5. Run the "Create Function to Get Current Subscription" script to add helper function

These changes will simplify the database structure and fix the current issues with the subscription system.
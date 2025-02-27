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
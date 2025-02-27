-- Stripe Subscription Integration Schema Modifications

-- 1. Subscription Plans Table
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'free', 'professional', 'business', 'enterprise'
  is_custom BOOLEAN DEFAULT FALSE,
  parent_plan_id UUID REFERENCES subscription_plans(id),
  monthly_price DECIMAL(10,2),
  annual_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  stripe_product_id TEXT,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  max_users INTEGER,
  min_users INTEGER,
  features JSONB DEFAULT '{}',
  effective_per_user_price DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Organization Table Updates
ALTER TABLE organizations
ADD COLUMN billing_email TEXT,
ADD COLUMN billing_name TEXT,
ADD COLUMN billing_address JSONB,
ADD COLUMN tax_id TEXT,
ADD COLUMN billing_cycle TEXT DEFAULT 'monthly', -- 'monthly' or 'annual'
ADD COLUMN subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_plan_id UUID REFERENCES subscription_plans(id),
ADD COLUMN payment_failed_count INTEGER DEFAULT 0,
ADD COLUMN last_payment_date TIMESTAMP WITH TIME ZONE;

-- 3. Subscription Transactions Table
CREATE TABLE subscription_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10,2),
  currency TEXT,
  status TEXT, -- 'succeeded', 'failed', 'pending'
  billing_reason TEXT, -- 'subscription_create', 'subscription_update', 'subscription_cycle'
  invoice_pdf_url TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Custom Plan Metadata Table
CREATE TABLE custom_plan_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  client_id UUID REFERENCES organizations(id) NOT NULL,
  justification TEXT,
  renewal_strategy VARCHAR(50),
  next_review_date TIMESTAMP WITH TIME ZONE,
  migration_path VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  special_terms TEXT
);

-- 5. Payment Methods Table
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  stripe_payment_method_id TEXT,
  type TEXT, -- 'card', 'bank_account', etc.
  is_default BOOLEAN DEFAULT FALSE,
  last_four TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  card_brand TEXT,
  billing_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX idx_subscription_plans_type ON subscription_plans(type);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_custom ON subscription_plans(is_custom);
CREATE INDEX idx_subscription_transactions_org ON subscription_transactions(organization_id);
CREATE INDEX idx_subscription_transactions_status ON subscription_transactions(status);
CREATE INDEX idx_payment_methods_org ON payment_methods(organization_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(organization_id, is_default);
CREATE INDEX idx_custom_plan_metadata_plan ON custom_plan_metadata(plan_id);
CREATE INDEX idx_custom_plan_metadata_client ON custom_plan_metadata(client_id);

-- 7. Row Level Security Policies

-- Subscription Plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (true);  -- Allow anyone to view any subscription plan

-- Only super admins can manage plans
CREATE POLICY "Only super admins can manage plans"
  ON subscription_plans
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE is_super_admin = TRUE)
  );

-- Subscription Transactions
ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;

-- Organization admins can view their transactions
CREATE POLICY "Organization admins can view their transactions"
  ON subscription_transactions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only system can create transactions
CREATE POLICY "Only system can create transactions"
  ON subscription_transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE is_super_admin = TRUE)
  );

-- Payment Methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Organization admins can view their payment methods
CREATE POLICY "Organization admins can view their payment methods"
  ON payment_methods FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Organization admins can manage their payment methods
CREATE POLICY "Organization admins can manage their payment methods"
  ON payment_methods
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Custom Plan Metadata
ALTER TABLE custom_plan_metadata ENABLE ROW LEVEL SECURITY;

-- Organization admins can view their custom plans
CREATE POLICY "Organization admins can view their custom plans"
  ON custom_plan_metadata FOR SELECT
  USING (
    client_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
    OR
    auth.uid() IN (SELECT id FROM auth.users WHERE is_super_admin = TRUE)
  );

-- Only super admins can manage custom plans
CREATE POLICY "Only super admins can manage custom plans"
  ON custom_plan_metadata
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE is_super_admin = TRUE)
  );

-- 8. Insert Default Plans
INSERT INTO subscription_plans (name, description, type, monthly_price, annual_price, features, is_active)
VALUES 
('Free', 'Perfect for small businesses or teams just getting started with time tracking.', 'free', 0, 0, 
 '{"timeTracking": true, "employeeProfiles": true, "basicReporting": true, "maxEmployees": 5, "mobileInterface": true, "emailSupport": true}', 
 TRUE),
 
('Professional', 'Ideal for growing businesses needing advanced time tracking and management features.', 'professional', 12, 129.6, 
 '{"timeTracking": true, "employeeProfiles": true, "basicReporting": true, "maxEmployees": null, "mobileInterface": true, "emailSupport": true, 
   "advancedTimeTracking": true, "breakManagement": true, "jobLocationTracking": true, "statusManagement": true, 
   "departmentOrganization": true, "roleBasedAccess": true, "basicPtoManagement": true, "locationManagement": true, 
   "advancedReporting": true, "prioritySupport": true}', 
 TRUE),
 
('Business', 'For medium to large businesses requiring comprehensive workforce management.', 'business', 20, 216, 
 '{"timeTracking": true, "employeeProfiles": true, "basicReporting": true, "maxEmployees": null, "mobileInterface": true, "emailSupport": true, 
   "advancedTimeTracking": true, "breakManagement": true, "jobLocationTracking": true, "statusManagement": true, 
   "departmentOrganization": true, "roleBasedAccess": true, "basicPtoManagement": true, "locationManagement": true, 
   "advancedReporting": true, "prioritySupport": true,
   "advancedPtoManagement": true, "accrualCalculations": true, "balanceHistory": true, "yearEndRollovers": true, 
   "multipleLeaveTypes": true, "calendarIntegration": true, "approvalWorkflows": true, "dataRetentionPolicies": true, 
   "advancedIntegrations": true, "advancedAnalytics": true, "customReportBuilder": true, "apiAccess": true, 
   "bulkOperations": true, "phoneSupport": true, "dataRetention": 90, "laborLawCompliance": true}', 
 TRUE),
 
('Enterprise', 'For large organizations needing maximum customization and support.', 'enterprise', null, null, 
 '{"timeTracking": true, "employeeProfiles": true, "basicReporting": true, "maxEmployees": null, "mobileInterface": true, "emailSupport": true, 
   "advancedTimeTracking": true, "breakManagement": true, "jobLocationTracking": true, "statusManagement": true, 
   "departmentOrganization": true, "roleBasedAccess": true, "basicPtoManagement": true, "locationManagement": true, 
   "advancedReporting": true, "prioritySupport": true,
   "advancedPtoManagement": true, "accrualCalculations": true, "balanceHistory": true, "yearEndRollovers": true, 
   "multipleLeaveTypes": true, "calendarIntegration": true, "approvalWorkflows": true, "dataRetentionPolicies": true, 
   "advancedIntegrations": true, "advancedAnalytics": true, "customReportBuilder": true, "apiAccess": true, 
   "bulkOperations": true, "phoneSupport": true, "dataRetention": null, "laborLawCompliance": true,
   "dedicatedAccountManager": true, "customImplementation": true, "ssoIntegration": true, "customRetentionPolicies": true, 
   "slaGuarantees": true, "advancedSecurity": true, "customIntegrations": true, "unlimitedDataRetention": true, 
   "onPremiseOption": true, "prioritySupport24x7": true}', 
 TRUE);
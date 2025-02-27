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
  o.id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

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
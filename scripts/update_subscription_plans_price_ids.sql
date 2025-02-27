-- Update subscription_plans with valid Stripe price IDs
-- Note: These are placeholder IDs. You'll need to replace them with actual Stripe price IDs from your Stripe dashboard.

-- Update the Free plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_free',
  stripe_monthly_price_id = 'price_free_monthly',
  stripe_annual_price_id = 'price_free_annual'
WHERE type = 'free';

-- Update the Professional plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_professional',
  stripe_monthly_price_id = 'price_professional_monthly',
  stripe_annual_price_id = 'price_professional_annual'
WHERE type = 'professional';

-- Update the Business plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_business',
  stripe_monthly_price_id = 'price_business_monthly',
  stripe_annual_price_id = 'price_business_annual'
WHERE type = 'business';

-- Update the Enterprise plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_enterprise',
  stripe_monthly_price_id = 'price_enterprise_monthly',
  stripe_annual_price_id = 'price_enterprise_annual'
WHERE type = 'enterprise';
-- Update subscription plans with mock Stripe price IDs for development and testing
-- This script is intended for use with the MockStripeService.ts implementation

-- Update the Free plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'mock_prod_free',
  stripe_monthly_price_id = 'mock_price_free_monthly',
  stripe_annual_price_id = 'mock_price_free_annual'
WHERE type = 'free';

-- Update the Professional plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'mock_prod_professional',
  stripe_monthly_price_id = 'mock_price_professional_monthly',
  stripe_annual_price_id = 'mock_price_professional_annual'
WHERE type = 'professional';

-- Update the Business plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'mock_prod_business',
  stripe_monthly_price_id = 'mock_price_business_monthly',
  stripe_annual_price_id = 'mock_price_business_annual'
WHERE type = 'business';

-- Update the Enterprise plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'mock_prod_enterprise',
  stripe_monthly_price_id = 'mock_price_enterprise_monthly',
  stripe_annual_price_id = 'mock_price_enterprise_annual'
WHERE type = 'enterprise';

-- Verify the updates
SELECT 
  id, 
  name, 
  type, 
  stripe_product_id, 
  stripe_monthly_price_id, 
  stripe_annual_price_id 
FROM 
  subscription_plans;
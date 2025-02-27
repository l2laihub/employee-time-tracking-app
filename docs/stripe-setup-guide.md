# Stripe Setup Guide for Subscription Integration

This guide will walk you through the process of setting up Stripe products and prices for your subscription plans, and then updating your database with the correct IDs.

## 1. Create Products in Stripe

First, you need to create products in Stripe for each of your subscription plans:

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Products > Add Product
3. Create the following products:
   - **Free Plan**
     - Name: Free
     - Description: Perfect for small businesses or teams just getting started with time tracking.
   - **Professional Plan**
     - Name: Professional
     - Description: Ideal for growing businesses needing advanced time tracking and management features.
   - **Business Plan**
     - Name: Business
     - Description: For medium to large businesses requiring comprehensive workforce management.
   - **Enterprise Plan**
     - Name: Enterprise
     - Description: For large organizations needing maximum customization and support.

## 2. Create Prices for Each Product

For each product, you need to create both monthly and annual prices:

1. In the Stripe Dashboard, go to each product you created
2. Click "Add Price"
3. Create the following prices:
   - **Free Plan**
     - Monthly: $0/month
     - Annual: $0/year
   - **Professional Plan**
     - Monthly: $12/month
     - Annual: $129.60/year (10% discount)
   - **Business Plan**
     - Monthly: $20/month
     - Annual: $216/year (10% discount)
   - **Enterprise Plan**
     - Custom pricing (you can create a placeholder price or leave this for custom quotes)

## 3. Get the Product and Price IDs

After creating the products and prices, you need to get their IDs:

1. In the Stripe Dashboard, go to Products
2. Click on each product to view its details
3. Note down the Product ID (starts with `prod_`)
4. Note down the Price IDs for both monthly and annual prices (starts with `price_`)

## 4. Update Your Database

Now you need to update your database with the correct Stripe IDs. Use the following SQL script as a template, replacing the placeholder IDs with your actual Stripe IDs:

```sql
-- Update the Free plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_XXXXXXXXXXXXXXXX',
  stripe_monthly_price_id = 'price_XXXXXXXXXXXXXXXX',
  stripe_annual_price_id = 'price_XXXXXXXXXXXXXXXX'
WHERE type = 'free';

-- Update the Professional plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_XXXXXXXXXXXXXXXX',
  stripe_monthly_price_id = 'price_XXXXXXXXXXXXXXXX',
  stripe_annual_price_id = 'price_XXXXXXXXXXXXXXXX'
WHERE type = 'professional';

-- Update the Business plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_XXXXXXXXXXXXXXXX',
  stripe_monthly_price_id = 'price_XXXXXXXXXXXXXXXX',
  stripe_annual_price_id = 'price_XXXXXXXXXXXXXXXX'
WHERE type = 'business';

-- Update the Enterprise plan
UPDATE subscription_plans
SET 
  stripe_product_id = 'prod_XXXXXXXXXXXXXXXX',
  stripe_monthly_price_id = 'price_XXXXXXXXXXXXXXXX',
  stripe_annual_price_id = 'price_XXXXXXXXXXXXXXXX'
WHERE type = 'enterprise';
```

## 5. Test the Integration

After updating your database with the correct Stripe IDs, you should be able to test the subscription integration:

1. Go to the subscription management page
2. Select a plan
3. Complete the checkout process
4. Verify that the subscription is created in Stripe
5. Verify that the subscription status is updated in your application

## Troubleshooting

If you encounter any issues, check the following:

1. Make sure your Stripe API keys are correctly set in your environment variables
2. Verify that the product and price IDs in your database match the ones in Stripe
3. Check the browser console for any errors
4. Check the Stripe Dashboard for any failed API requests
5. Ensure that your RLS policies allow access to the necessary tables
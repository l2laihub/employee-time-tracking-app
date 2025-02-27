-- Check if the organizations table has the necessary columns for Stripe integration

-- Check if the table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'organizations'
);

-- Check if the necessary columns exist
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_schema = 'public' 
  AND table_name = 'organizations'
  AND column_name IN (
    'stripe_customer_id',
    'stripe_subscription_id',
    'plan_type',
    'subscription_status',
    'billing_cycle',
    'billing_email',
    'billing_name',
    'billing_address',
    'tax_id',
    'subscription_start_date',
    'subscription_end_date',
    'trial_end_date',
    'subscription_plan_id',
    'payment_failed_count',
    'last_payment_date'
  );

-- Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' 
  AND tablename = 'organizations';

-- List all policies on the organizations table
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM 
  pg_policies 
WHERE 
  schemaname = 'public' 
  AND tablename = 'organizations';
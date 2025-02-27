-- Remove Stripe-specific fields from organizations table
-- This script should be run after migrating data to the subscriptions table

-- First, check if the columns exist before trying to drop them
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
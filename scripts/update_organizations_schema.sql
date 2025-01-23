-- First, let's check if the organizations table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        -- Create organizations table if it doesn't exist
        CREATE TABLE public.organizations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            plan_type TEXT DEFAULT 'free',
            subscription_status TEXT DEFAULT 'active',
            settings JSONB DEFAULT '{}',
            branding JSONB DEFAULT '{
                "primary_color": "#3b82f6",
                "secondary_color": "#1e40af",
                "logo_url": null,
                "favicon_url": null,
                "company_name": null,
                "company_website": null
            }'::jsonb,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT
        );
    ELSE
        -- Add missing columns if table exists
        BEGIN
            ALTER TABLE public.organizations 
            ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
            ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{
                "primary_color": "#3b82f6",
                "secondary_color": "#1e40af",
                "logo_url": null,
                "favicon_url": null,
                "company_name": null,
                "company_website": null
            }'::jsonb,
            ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
            ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
        EXCEPTION WHEN duplicate_column THEN
            -- Handle case where column already exists
            NULL;
        END;
    END IF;
END $$;

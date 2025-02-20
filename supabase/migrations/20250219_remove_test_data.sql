-- Migration: Remove Test Data
-- Description: Implements safe removal of test organization data with backup and rollback capabilities

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create cleanup logging table
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation TEXT NOT NULL,
    affected_tables TEXT[],
    record_counts JSONB,
    status TEXT,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT,
    backup_tables TEXT[]
);

-- Create backup tables function
CREATE OR REPLACE FUNCTION public.create_test_data_backups(
    test_org_ids UUID[],
    cleanup_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    timestamp_suffix TEXT;
    created_backup_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    timestamp_suffix := to_char(current_timestamp, 'YYYYMMDD_HH24MISS');
    
    -- Create backup tables for each affected table
    EXECUTE format(
        'CREATE TABLE public.organizations_backup_%s AS
         SELECT * FROM public.organizations WHERE id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('organizations_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.organization_members_backup_%s AS
         SELECT * FROM public.organization_members WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('organization_members_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.organization_invites_backup_%s AS
         SELECT * FROM public.organization_invites WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('organization_invites_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.time_entries_backup_%s AS
         SELECT * FROM public.time_entries WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('time_entries_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.job_locations_backup_%s AS
         SELECT * FROM public.job_locations WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('job_locations_backup_%s', timestamp_suffix);
    
    EXECUTE format(
        'CREATE TABLE public.pto_requests_backup_%s AS
         SELECT * FROM public.pto_requests WHERE organization_id = ANY($1)', timestamp_suffix
    ) USING test_org_ids;
    created_backup_tables := created_backup_tables || format('pto_requests_backup_%s', timestamp_suffix);
    
    -- Update cleanup log with backup tables
    UPDATE public.cleanup_logs
    SET backup_tables = created_backup_tables
    WHERE id = cleanup_id;
    
    -- Create indexes on backup tables
    FOR i IN 1..array_length(created_backup_tables, 1) LOOP
        -- Create appropriate index based on table type
        IF created_backup_tables[i] LIKE 'organizations_backup_%' THEN
            EXECUTE format(
                'CREATE INDEX ON public.%I (id)',
                created_backup_tables[i]
            );
        ELSE
            EXECUTE format(
                'CREATE INDEX ON public.%I (organization_id)',
                created_backup_tables[i]
            );
        END IF;
    END LOOP;
END;
$$;

-- Create validation function
CREATE OR REPLACE FUNCTION public.validate_test_data_removal(
    test_org_ids UUID[]
)
RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT,
    validation_passed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 'organizations'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) > 0
    FROM public.organizations
    WHERE id = ANY(test_org_ids)
    UNION ALL
    SELECT 'organization_members'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) = (
               SELECT COUNT(*)
               FROM public.organization_members
               WHERE organization_id = ANY(test_org_ids)
           )
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE o.id = ANY(test_org_ids)
    UNION ALL
    SELECT 'time_entries'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) = (
               SELECT COUNT(*)
               FROM public.time_entries
               WHERE organization_id = ANY(test_org_ids)
           )
    FROM public.time_entries te
    JOIN public.organizations o ON o.id = te.organization_id
    WHERE o.id = ANY(test_org_ids);
END;
$$;

-- Create cleanup function with batching
CREATE OR REPLACE FUNCTION public.remove_test_organizations(
    test_org_ids UUID[],
    batch_size INTEGER DEFAULT 1000
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleanup_id UUID;
    affected_count INTEGER;
    total_count INTEGER;
    current_batch INTEGER;
    batch_ids UUID[];
BEGIN
    -- Create cleanup log entry
    INSERT INTO public.cleanup_logs (
        operation,
        affected_tables,
        status,
        created_by
    )
    VALUES (
        'remove_test_organizations',
        ARRAY['organizations', 'organization_members', 'time_entries', 'job_locations', 'pto_requests'],
        'started',
        current_user
    )
    RETURNING id INTO cleanup_id;
    
    -- Create backups
    PERFORM public.create_test_data_backups(test_org_ids, cleanup_id);
    
    -- Delete related records in batches using CTEs
    -- Organization metrics
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.organization_metrics
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.organization_metrics
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- API keys
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.api_keys
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.api_keys
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- PTO requests
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.pto_requests
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.pto_requests
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Time entries
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.time_entries
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.time_entries
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Job locations
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.job_locations
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.job_locations
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Organization invites
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.organization_invites
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.organization_invites
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Organization members
    WITH RECURSIVE batch_delete AS (
        SELECT id, organization_id
        FROM public.organization_members
        WHERE organization_id = ANY(test_org_ids)
        LIMIT batch_size
    )
    DELETE FROM public.organization_members
    WHERE id IN (SELECT id FROM batch_delete);
    
    -- Finally, delete organizations
    DELETE FROM public.organizations
    WHERE id = ANY(test_org_ids);
    
    -- Update cleanup log
    UPDATE public.cleanup_logs
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = cleanup_id;

EXCEPTION WHEN OTHERS THEN
    -- Update cleanup log with error
    UPDATE public.cleanup_logs
    SET status = 'failed',
        error_message = SQLERRM,
        completed_at = NOW()
    WHERE id = cleanup_id;
    
    RAISE EXCEPTION 'Cleanup failed: %', SQLERRM;
END;
$$;

-- Create rollback function
CREATE OR REPLACE FUNCTION public.rollback_test_data_cleanup(
    cleanup_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    backup_table TEXT;
    cleanup_record RECORD;
BEGIN
    -- Get cleanup record
    SELECT * INTO cleanup_record
    FROM public.cleanup_logs
    WHERE id = cleanup_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cleanup record not found';
    END IF;
    
    -- Start rollback transaction
    BEGIN
        -- Restore data from each backup table
        FOREACH backup_table IN ARRAY cleanup_record.backup_tables
        LOOP
            EXECUTE format(
                'INSERT INTO public.%I 
                 SELECT * FROM public.%I
                 ON CONFLICT DO NOTHING',
                regexp_replace(backup_table, '_backup_\d+$', ''),
                backup_table
            );
        END LOOP;
        
        -- Log rollback
        INSERT INTO public.cleanup_logs (
            operation,
            affected_tables,
            status,
            created_by
        )
        VALUES (
            'rollback_test_data_cleanup',
            cleanup_record.affected_tables,
            'completed',
            current_user
        );
        
        COMMIT;
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Rollback failed: %', SQLERRM;
    END;
END;
$$;

-- Create function to clean up old backup tables
CREATE OR REPLACE FUNCTION public.cleanup_old_backup_tables(
    days_to_retain INTEGER DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    backup_table TEXT;
BEGIN
    FOR backup_table IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name LIKE '%_backup_%'
        AND table_schema = 'public'
        AND to_timestamp(regexp_replace(table_name, '^.*_(\d{8}_\d{6})$', '\1'), 'YYYYMMDD_HH24MISS')
            < current_timestamp - (days_to_retain || ' days')::interval
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I', backup_table);
    END LOOP;
END;
$$;

-- Create indexes to improve cleanup performance
CREATE INDEX IF NOT EXISTS idx_organization_metrics_org ON public.organization_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_pto_requests_org ON public.pto_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org ON public.time_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_locations_org ON public.job_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON public.organization_members(organization_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_test_data_backups(UUID[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_test_data_removal(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_test_organizations(UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_test_data_cleanup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_backup_tables(INTEGER) TO authenticated;
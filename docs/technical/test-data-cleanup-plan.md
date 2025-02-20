# Test Data Cleanup Migration Plan

## Overview
This document outlines the plan for safely removing test data associated with specific organization IDs while maintaining data integrity and providing rollback capabilities.

## Prerequisites
- Backup of all affected tables
- List of test organization IDs
- Sufficient database maintenance window
- Verification of foreign key relationships

## Implementation Steps

### 1. Pre-Cleanup Validation
```sql
-- Create validation function to ensure data consistency
CREATE OR REPLACE FUNCTION validate_test_data_removal(
    test_org_ids UUID[]
)
RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT,
    validation_passed BOOLEAN
);
```

### 2. Backup Creation
```sql
-- Create backup tables with timestamps
CREATE TABLE organizations_backup_{timestamp} AS 
SELECT * FROM organizations WHERE id = ANY($1);

-- Create backup function for all related tables
CREATE OR REPLACE FUNCTION create_test_data_backups(
    test_org_ids UUID[]
) RETURNS void;
```

### 3. Cleanup Transaction
```sql
-- Main cleanup function with transaction management
CREATE OR REPLACE FUNCTION remove_test_organizations(
    test_org_ids UUID[]
) RETURNS void AS $$
BEGIN
    -- Start transaction
    BEGIN
        -- Delete in correct order to maintain referential integrity
        DELETE FROM organization_metrics WHERE organization_id = ANY($1);
        DELETE FROM api_keys WHERE organization_id = ANY($1);
        DELETE FROM pto_requests WHERE organization_id = ANY($1);
        DELETE FROM time_entries WHERE organization_id = ANY($1);
        DELETE FROM job_locations WHERE organization_id = ANY($1);
        DELETE FROM organization_members WHERE organization_id = ANY($1);
        DELETE FROM organizations WHERE id = ANY($1);
        
        -- Commit transaction
        COMMIT;
    EXCEPTION WHEN OTHERS THEN
        -- Rollback on error
        ROLLBACK;
        RAISE EXCEPTION 'Cleanup failed: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;
```

### 4. Logging Implementation
```sql
-- Create logging table
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation TEXT NOT NULL,
    affected_tables TEXT[],
    record_counts JSONB,
    status TEXT,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Logging function
CREATE OR REPLACE FUNCTION log_cleanup_operation(
    operation TEXT,
    affected_tables TEXT[],
    record_counts JSONB,
    status TEXT,
    error_message TEXT DEFAULT NULL
) RETURNS UUID;
```

### 5. Rollback Functionality
```sql
-- Rollback function using backups
CREATE OR REPLACE FUNCTION rollback_test_data_cleanup(
    cleanup_id UUID
) RETURNS void AS $$
BEGIN
    -- Restore data from backup tables
    -- Use dynamic SQL to handle multiple backup tables
END;
$$;
```

### 6. Performance Optimizations
- Batch processing for large datasets
- Temporary index creation
- Table partitioning for backup tables
- Progress monitoring

```sql
-- Batch processing function
CREATE OR REPLACE FUNCTION batch_delete_records(
    table_name TEXT,
    batch_size INTEGER,
    where_clause TEXT
) RETURNS INTEGER;
```

## Execution Plan

1. **Preparation Phase**
   - Create all required functions and tables
   - Verify database maintenance window
   - Ensure sufficient disk space for backups
   - Take initial database metrics

2. **Validation Phase**
   - Run validation function
   - Verify foreign key relationships
   - Generate impact report

3. **Backup Phase**
   - Create timestamped backup tables
   - Verify backup integrity
   - Log backup completion

4. **Cleanup Phase**
   - Execute cleanup in batches
   - Monitor progress
   - Log all operations
   - Verify data consistency

5. **Verification Phase**
   - Run validation checks
   - Verify referential integrity
   - Confirm no unintended data loss

## Rollback Plan

1. **Trigger Conditions**
   - Data inconsistency detected
   - Unintended data removal
   - System performance issues

2. **Rollback Steps**
   - Stop cleanup process
   - Execute rollback function
   - Verify data restoration
   - Log rollback completion

## Monitoring and Logging

- Track progress through cleanup_logs table
- Monitor database performance metrics
- Log all operations with timestamps
- Track affected record counts

## Success Criteria

1. All test data successfully removed
2. No impact on production data
3. Referential integrity maintained
4. All operations logged
5. Backup tables created and verified
6. No performance impact on production system

## Post-Cleanup Tasks

1. Verify data consistency
2. Archive backup tables
3. Generate cleanup report
4. Update documentation
5. Clean up temporary objects

## Implementation Notes

- Execute during low-traffic periods
- Monitor system performance
- Keep backup tables for 30 days
- Document all executed steps
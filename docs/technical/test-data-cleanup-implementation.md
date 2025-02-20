# Test Data Cleanup Implementation Guide

## Migration Script Implementation

The cleanup functionality will be implemented in `supabase/migrations/20250219_remove_test_data.sql`. Here's the detailed implementation plan:

### 1. Database Objects

#### Cleanup Logs Table
```sql
CREATE TABLE public.cleanup_logs (
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
```

#### Backup Creation Function
```sql
CREATE OR REPLACE FUNCTION public.create_test_data_backups(
    test_org_ids UUID[],
    cleanup_id UUID
)
RETURNS void;
```

#### Validation Function
```sql
CREATE OR REPLACE FUNCTION public.validate_test_data_removal(
    test_org_ids UUID[]
)
RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT,
    validation_passed BOOLEAN
);
```

#### Cleanup Function
```sql
CREATE OR REPLACE FUNCTION public.remove_test_organizations(
    test_org_ids UUID[],
    batch_size INTEGER DEFAULT 1000
)
RETURNS void;
```

#### Rollback Function
```sql
CREATE OR REPLACE FUNCTION public.rollback_test_data_cleanup(
    cleanup_id UUID
)
RETURNS void;
```

### 2. Performance Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_organization_metrics_org 
ON public.organization_metrics(organization_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_org 
ON public.api_keys(organization_id);

CREATE INDEX IF NOT EXISTS idx_pto_requests_org 
ON public.pto_requests(organization_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_org 
ON public.time_entries(organization_id);

CREATE INDEX IF NOT EXISTS idx_job_locations_org 
ON public.job_locations(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_org 
ON public.organization_members(organization_id);
```

### 3. Security Considerations

- Functions will be created with `SECURITY DEFINER`
- Appropriate permissions will be granted to authenticated users
- All operations will be logged with user attribution
- Backup tables will inherit original table permissions

### 4. Deletion Order

The cleanup will follow this order to maintain referential integrity:

1. organization_metrics
2. api_keys
3. pto_requests
4. time_entries
5. job_locations
6. organization_members
7. organizations

### 5. Error Handling

- All operations wrapped in transactions
- Detailed error logging
- Automatic rollback on failure
- Error notification system

### 6. Backup Strategy

- Timestamped backup tables
- Indexes on backup tables for efficient rollback
- Automatic cleanup of old backups
- Backup verification before deletion

## Implementation Steps

1. Create cleanup_logs table
2. Implement backup functionality
3. Create validation function
4. Implement main cleanup function
5. Create rollback capability
6. Add performance indexes
7. Set up security policies
8. Add monitoring capabilities

## Testing Plan

1. **Unit Tests**
   - Test each function independently
   - Verify rollback functionality
   - Check error handling
   - Validate logging

2. **Integration Tests**
   - Test complete cleanup workflow
   - Verify data integrity
   - Check performance with large datasets
   - Test concurrent operations

3. **Performance Tests**
   - Measure cleanup duration
   - Monitor system resources
   - Test with various batch sizes
   - Verify index effectiveness

## Deployment Strategy

1. **Pre-deployment**
   - Backup database
   - Verify disk space
   - Check permissions
   - Update documentation

2. **Deployment**
   - Run migration during low-traffic period
   - Monitor system performance
   - Verify successful creation of all objects
   - Test with sample data

3. **Post-deployment**
   - Verify all functions work
   - Check security policies
   - Update monitoring systems
   - Train team members

## Next Steps

To implement this solution:

1. Switch to Code mode to create the migration script
2. Implement the functions and tables
3. Create test cases
4. Deploy and verify the solution
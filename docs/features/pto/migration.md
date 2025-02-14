# PTO Feature Migration Guide

This guide details the process of migrating the PTO (Paid Time Off) feature from mock data to Supabase integration.

## Overview

The migration replaces the mock data implementation in `src/lib/mockPTOData.ts` with a proper Supabase database integration while maintaining exact feature parity.

## Prerequisites

1. Supabase CLI installed and configured
```bash
npm install -g supabase
supabase login
```

2. PostgreSQL client installed
```bash
# For Windows
choco install postgresql
# Verify installation
psql --version
```

3. Required environment variables
```bash
# .env
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Migration Process

### 1. Review Documentation
- Implementation Plan: [implementation-plan.md](./implementation-plan.md)
- Test Plan: [test-plan.md](./test-plan.md)

### 2. Run Database Migrations

```bash
# Apply base table structure
supabase migration up 20250210_create_pto_requests.sql

# Apply schema updates
supabase migration up 20250210_update_pto_requests.sql
```

### 3. Verify Database Schema

```sql
-- Check table structure
\d public.pto_requests

-- Verify RLS policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'pto_requests';
```

### 4. Run Migration Script

```bash
# Make script executable
chmod +x scripts/migrate_pto_data.sh

# Run migration
./scripts/migrate_pto_data.sh
```

The script will:
- Create backups
- Run migrations
- Seed test data
- Run tests
- Verify data
- Clean up mock data
- Update imports

## Verification Steps

### 1. Database Verification
```sql
-- Check data migration
SELECT COUNT(*) FROM public.pto_requests;

-- Verify PTO balances
SELECT e.id, e.email,
       e.pto->>'vacation'->>'used' as vacation_used,
       e.pto->>'sickLeave'->>'used' as sick_leave_used
FROM public.employees e;
```

### 2. Application Testing
```bash
# Run test suite
npm run test

# Start development server
npm run dev

# Run E2E tests
npm run test:e2e
```

### 3. Manual Testing Checklist

- [ ] Create new PTO request
- [ ] View PTO balances
- [ ] Approve/reject requests (as manager)
- [ ] Filter PTO requests
- [ ] Check balance calculations
- [ ] Verify error handling

## Rollback Procedure

If issues are encountered:

1. Execute rollback function
```sql
SELECT rollback_pto_mock_cleanup();
```

2. Restore mock data files
```bash
# Files are backed up in ./backups/[timestamp]/mock_data/
cp ./backups/[timestamp]/mock_data/mockPTOData.ts src/lib/mockPTOData.ts
```

3. Revert database
```bash
# Restore from backup
psql -f ./backups/[timestamp]/pre_migration_backup.sql
```

## Post-Migration Cleanup

After successful verification:

1. Remove mock data files
```bash
rm src/lib/mockPTOData.ts
```

2. Update imports
```bash
# Script will handle this automatically
```

3. Clean up backup data (optional)
```sql
DROP TABLE IF EXISTS public.mock_pto_requests_backup;
```

## Monitoring

Monitor the following after migration:

1. Performance Metrics
- Request response times
- Balance calculation speed
- Query execution times

2. Error Rates
- Failed requests
- Invalid calculations
- Permission errors

3. Data Integrity
- PTO balance accuracy
- Request status consistency
- Cross-organization isolation

## Support

If you encounter issues:

1. Check migration logs
```bash
cat ./backups/[timestamp]/migration.log
```

2. Review error logs
```bash
cat ./backups/[timestamp]/verification.log
```

3. Contact Support
- Open an issue in the repository
- Tag with 'pto-migration'
- Include relevant logs

## References

- [Supabase Documentation](https://supabase.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Project Documentation](../../README.md)

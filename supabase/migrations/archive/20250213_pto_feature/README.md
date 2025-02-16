# Archived PTO Feature Migrations

These migrations were created during the development of the PTO feature on February 13, 2025. They have been archived for historical reference after being consolidated into a single migration file.

## Consolidated Migration

All these changes are now represented in a single migration file:
`supabase/migrations/20250213_consolidated_pto_schema.sql`

## Original Migration Files

The following migrations were consolidated:

1. Schema Changes:
   - add_hours_to_pto_requests.sql
   - rename_notes_to_reason.sql
   - add_created_by_to_pto_requests.sql
   - fix_pto_requests_fk.sql
   - fix_pto_requests_fk_v2.sql

2. Policy Changes:
   - update_pto_request_policies.sql
   - update_pto_request_type.sql
   - fix_pto_request_policies.sql
   - fix_pto_request_policies_v2.sql
   - simplify_pto_policies.sql
   - simplify_pto_policies_v3.sql
   - simplify_pto_policies_v4.sql
   - simplify_pto_policies_v5.sql
   - simple_pto_policy.sql
   - simple_pto_policy_v2.sql
   - simple_pto_policy_v3.sql
   - simple_pto_policy_v4.sql
   - simple_pto_policy_v5.sql
   - add_pto_read_policy.sql

3. Function Changes:
   - create_pto_request_function.sql
   - create_pto_request_function_v2.sql

## Why Consolidated?

These migrations were created during iterative development of the PTO feature. After the feature was completed and tested, they were consolidated to:

1. Improve clarity of the database schema history
2. Make it easier to understand the final state of PTO-related tables and policies
3. Reduce clutter in the migrations directory

## Note

These migrations have already been applied to the database. The consolidated migration file is for documentation purposes and for setting up new environments. Do not attempt to reapply these migrations to an existing database.
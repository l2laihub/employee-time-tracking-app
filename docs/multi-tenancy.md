# Organization and User Management Guide

## Overview
The application implements a single-organization-per-user model where each user belongs to exactly one organization with a specific role (admin, manager, employee). This model simplifies data isolation and access control while maintaining clear organizational boundaries.

## Database Schema

### Organizations Table
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  branding JSONB DEFAULT '{
    "primary_color": "#3b82f6",
    "secondary_color": "#1e40af",
    "logo_url": null,
    "favicon_url": null,
    "company_name": null,
    "company_website": null
  }'::jsonb
);
```

### Organization Members Table
```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID NOT NULL,
  role user_role DEFAULT 'employee'::user_role,
  UNIQUE(user_id) -- Enforces one organization per user
);
```

## Row Level Security (RLS)
The application uses Supabase RLS policies to enforce data isolation:

1. Organizations are only visible to their members
2. Only admins can update organization settings
3. Members can view other members in their organization
4. Time entries are scoped to organizations and roles

## Implementation Details

### Organization Context
The `OrganizationContext` provides:
- Organization state management
- User role management
- Organization operations (create, join, leave)
- Member management (invite, revoke)

### User Flow
1. User signs up/logs in
2. If no organization:
   - Create new organization as admin
   - Join existing organization via invite
3. If has organization:
   - Automatically redirected to dashboard
   - Access features based on role

## Best Practices

1. **Data Isolation**
   - Always include organization_id in queries
   - Use RLS policies to enforce isolation
   - Validate organization access in application code

2. **Role-based Access**
   - Check user roles before operations
   - Use RLS policies for role-based restrictions
   - Implement role checks in UI components

3. **Organization Management**
   - Validate one-org-per-user constraint
   - Handle organization leaving/joining properly
   - Clear user data when leaving organization

## Common Issues & Solutions

1. **Organization Access**
   - Always verify organization membership
   - Handle missing organization gracefully
   - Redirect to organization selection when needed

2. **Role-based UI**
   - Use userRole from context for UI decisions
   - Implement role-based component rendering
   - Update UI when role changes

3. **Data Consistency**
   - Use transactions for critical operations
   - Validate organization membership before operations
   - Handle edge cases (e.g., last admin leaving)

## Security Considerations

1. **Access Control**
   - RLS policies enforce data isolation
   - Role-based permissions at database level
   - Application-level role checks

2. **Organization Boundaries**
   - Users can only access their organization's data
   - Strict validation of organization membership
   - Proper cleanup when users leave

3. **Invite System**
   - Secure invite codes
   - Email validation
   - Expiring invites
   - Prevention of duplicate invites

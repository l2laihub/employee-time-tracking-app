# Employee Management Security & Best Practices

## Row Level Security (RLS)

### Organization-Based Access
```sql
-- Organizations can view their own employees
CREATE POLICY "Organizations can view their own employees"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Only admins and managers can insert employees
CREATE POLICY "Admins and managers can insert employees"
    ON public.employees
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND organization_id = NEW.organization_id
            AND role IN ('admin', 'manager')
        )
    );

-- Only admins and department managers can update employees
CREATE POLICY "Admins and department managers can update employees"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid()
            AND organization_id = OLD.organization_id
            AND (
                role = 'admin' 
                OR (role = 'manager' AND department = OLD.department)
            )
        )
    );
```

## Access Control

### Role-Based Access
1. **Admin**
   - Full CRUD access to all employees
   - Can import/export employee data
   - Can manage roles and permissions

2. **Manager**
   - CRUD access to department employees
   - Can view department reports
   - Cannot change roles above their level

3. **Employee**
   - Read-only access to own profile
   - Can update certain personal information
   - Cannot view other employees' sensitive data

### Permission Checks
```typescript
function hasPermission(user: User, action: 'create' | 'read' | 'update' | 'delete', resource: Employee): boolean {
  // Admin has full access
  if (user.role === 'admin') return true;

  // Manager can only manage their department
  if (user.role === 'manager') {
    return action === 'read' || resource.department === user.department;
  }

  // Employee can only read their own data
  if (user.role === 'employee') {
    return action === 'read' && resource.id === user.employeeId;
  }

  return false;
}
```

## Data Protection

### Sensitive Data Handling
1. **Personal Information**
   - Email encryption in transit
   - Phone number masking in UI
   - Secure storage of sensitive data

2. **Access Logs**
   - Track all data access attempts
   - Record modifications with timestamps
   - Maintain audit trail

### Data Validation
```typescript
const employeeSchema = {
  type: 'object',
  required: ['first_name', 'last_name', 'email', 'role', 'start_date'],
  properties: {
    first_name: { type: 'string', minLength: 1 },
    last_name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string', pattern: '^[0-9-+()]*$' },
    role: { type: 'string', enum: ['admin', 'manager', 'employee'] },
    department: { type: 'string' },
    start_date: { type: 'string', format: 'date' },
    status: { type: 'string', enum: ['active', 'inactive'] }
  }
};
```

## Error Handling Best Practices

### Input Validation
1. **Server-Side Validation**
   - Always validate on server regardless of client validation
   - Check data types and formats
   - Validate business rules

2. **Client-Side Validation**
   - Immediate feedback to users
   - Prevent invalid submissions
   - Enhance user experience

### Error Messages
1. **User-Friendly Messages**
   - Clear and actionable
   - No technical details in user messages
   - Guidance for resolution

2. **Logging**
   - Detailed error logs for debugging
   - Stack traces in development
   - Error tracking and monitoring

## CSV Import Security

### File Validation
1. **Content Type Checking**
   ```typescript
   function isValidCSV(file: File): boolean {
     return (
       file.type === 'text/csv' ||
       file.name.endsWith('.csv')
     );
   }
   ```

2. **Size Limits**
   ```typescript
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
   if (file.size > MAX_FILE_SIZE) {
     throw new Error('File size exceeds limit');
   }
   ```

3. **Content Validation**
   - Check for malicious content
   - Validate data formats
   - Prevent formula injection

### Rate Limiting
```typescript
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000 // 1 minute
};
```

## Best Practices

### Password and Authentication
1. Use Supabase Auth for authentication
2. Implement MFA for sensitive operations
3. Regular session management

### Data Access
1. Always use parameterized queries
2. Implement proper error handling
3. Use transactions for multi-step operations

### Audit Trail
1. Log all sensitive operations
2. Track data modifications
3. Maintain compliance records

# Employee Management Architecture

## Database Schema

### Tables

#### employees
```sql
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    member_id UUID REFERENCES organization_members(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    department TEXT,
    start_date DATE NOT NULL,
    pto JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

### Relationships
- `organization_id`: Many-to-one relationship with organizations
- `member_id`: Optional one-to-one relationship with organization_members

### Indexes
- `idx_employees_organization_id`: For faster organization-based queries
- `idx_employees_member_id`: For faster member lookups
- `idx_employees_department`: For department-based filtering
- `idx_employees_status`: For status-based filtering

## Service Layer

### Employee Service (`src/services/employees.ts`)
- CRUD operations for employees
- Bulk import functionality
- PTO management
- Error handling and validation

### Context Layer (`src/contexts/EmployeeContext.tsx`)
- State management for employees
- Caching and optimistic updates
- Error handling and retry logic

## Component Architecture

### Pages
- `src/pages/Employees.tsx`: Main employee management page
  - List view with filtering and sorting
  - Integration with modals and forms

### Components
```
src/components/employees/
├── EmployeeForm.tsx       # Add/Edit employee form
├── EmployeeList.tsx       # Employee list display
├── EmployeeFilters.tsx    # Search and filter controls
├── ImportEmployeesModal.tsx # CSV import modal
└── PTOManagement.tsx      # PTO tracking interface
```

## Security

### Row Level Security (RLS)
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
```

### Role-Based Access Control
- Admins: Full CRUD access
- Managers: Department-scoped CRUD access
- Employees: Read-only access to own data

## Integration Points

### Authentication
- Supabase Auth for user management
- JWT tokens for API authentication

### Organization System
- Organization membership management
- Role-based permissions

### Time Tracking System
- Employee availability tracking
- PTO integration

## Error Handling

### CSV Import Validation
1. Pre-validation checks
   - Required fields
   - Data format
   - Role validation
2. Duplicate detection
   - Email uniqueness check
   - Detailed error messages
3. Batch processing
   - Transaction management
   - Rollback on error

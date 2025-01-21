# Employee Management

The Employee Management module in ClockFlow handles all aspects of employee data and workforce management.

## Features

### 1. Profile Management
- Personal information
- Employment details
- Role assignments
- Department organization
- Contact information

### 2. Access Control
- Role-based permissions
- Department-level access
- Custom permission sets
- Security policies
- Audit logging

### 3. Performance Tracking
- Time tracking metrics
- Attendance records
- PTO usage
- Compliance monitoring
- Performance reports

## Implementation

### 1. Employee Profiles

```typescript
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  startDate: Date;
  status: 'active' | 'inactive' | 'terminated';
  manager?: string;
  roles: string[];
  permissions: Permission[];
  preferences: UserPreferences;
}

async function createEmployee(employee: Employee): Promise<Employee> {
  // Validate employee data
  validateEmployee(employee);
  
  // Create auth account
  const { user } = await supabase.auth.signUp({
    email: employee.email,
    password: generateTempPassword()
  });
  
  // Create employee record
  const { data, error } = await supabase
    .from('employees')
    .insert({
      ...employee,
      auth_id: user.id
    });
    
  if (error) throw error;
  
  // Set up initial permissions
  await setupEmployeePermissions(data.id, employee.roles);
  
  // Send welcome email
  await sendWelcomeEmail(employee);
  
  return data;
}
```

### 2. Role Management

```typescript
interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  description: string;
}

interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  conditions?: object;
}

async function assignRole(employeeId: string, roleId: string): Promise<void> {
  // Get role details
  const role = await getRole(roleId);
  
  // Validate role assignment
  await validateRoleAssignment(employeeId, role);
  
  // Assign role
  await supabase
    .from('employee_roles')
    .insert({
      employee_id: employeeId,
      role_id: roleId
    });
    
  // Update permissions
  await updateEmployeePermissions(employeeId);
  
  // Log change
  await logAuditEvent({
    type: 'role_assignment',
    employeeId,
    roleId,
    timestamp: new Date()
  });
}
```

### 3. Department Organization

```typescript
interface Department {
  id: string;
  name: string;
  managerId: string;
  parentDepartmentId?: string;
  budget?: number;
  employees: string[];
}

async function organizeDepartment(department: Department): Promise<void> {
  // Validate department structure
  validateDepartmentStructure(department);
  
  // Update department
  await supabase
    .from('departments')
    .upsert(department);
    
  // Update employee assignments
  await updateDepartmentEmployees(
    department.id,
    department.employees
  );
  
  // Update reporting structure
  await updateReportingStructure(department);
}
```

## User Interface

### 1. Employee Directory

```tsx
function EmployeeDirectory() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<EmployeeFilters>({});
  
  useEffect(() => {
    const fetchEmployees = async () => {
      const data = await getFilteredEmployees(filters);
      setEmployees(data);
    };
    
    fetchEmployees();
  }, [filters]);
  
  return (
    <div className="employee-directory">
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
      />
      <EmployeeList
        employees={employees}
        onEmployeeSelect={handleSelect}
      />
      <PaginationControls />
    </div>
  );
}
```

### 2. Employee Profile Editor

```tsx
function EmployeeProfileEditor({ employee }: Props) {
  const form = useForm<Employee>({
    defaultValues: employee
  });
  
  const onSubmit = async (data: Employee) => {
    try {
      await updateEmployee(employee.id, data);
      showSuccess('Employee updated successfully');
    } catch (error) {
      showError(error.message);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <PersonalInformation
        control={form.control}
      />
      <EmploymentDetails
        control={form.control}
      />
      <RoleAssignment
        control={form.control}
        employeeId={employee.id}
      />
      <DepartmentSelector
        control={form.control}
      />
      <Button type="submit">
        Save Changes
      </Button>
    </form>
  );
}
```

## Database Schema

```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  department_id UUID REFERENCES departments(id),
  position TEXT NOT NULL,
  start_date DATE NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'terminated')),
  manager_id UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  manager_id UUID REFERENCES employees(id),
  parent_department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE employee_roles (
  employee_id UUID REFERENCES employees(id),
  role_id UUID REFERENCES roles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (employee_id, role_id)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Business Logic

### 1. Permission Checking

```typescript
async function checkPermission(
  employeeId: string,
  resource: string,
  action: string
): Promise<boolean> {
  // Get employee roles
  const roles = await getEmployeeRoles(employeeId);
  
  // Get role permissions
  const permissions = await getRolePermissions(roles);
  
  // Check if any role grants the permission
  return permissions.some(permission =>
    permission.resource === resource &&
    permission.action === action &&
    evaluateConditions(permission.conditions)
  );
}

function evaluateConditions(conditions?: object): boolean {
  if (!conditions) return true;
  
  // Evaluate each condition
  return Object.entries(conditions).every(([key, value]) => {
    switch (key) {
      case 'department':
        return checkDepartmentCondition(value);
      case 'timeRange':
        return checkTimeRangeCondition(value);
      default:
        return false;
    }
  });
}
```

### 2. Organization Structure

```typescript
async function getReportingStructure(
  employeeId: string
): Promise<ReportingStructure> {
  const employee = await getEmployee(employeeId);
  
  // Get direct reports
  const directReports = await getDirectReports(employeeId);
  
  // Get manager chain
  const managerChain = await getManagerChain(employee.manager);
  
  return {
    employee,
    directReports,
    managerChain
  };
}

async function getManagerChain(managerId?: string): Promise<Employee[]> {
  if (!managerId) return [];
  
  const manager = await getEmployee(managerId);
  const chain = await getManagerChain(manager.manager);
  
  return [...chain, manager];
}
```

## Integration Points

### 1. Authentication Integration

```typescript
async function syncEmployeeAuth(employee: Employee): Promise<void> {
  // Update auth user
  await supabase.auth.admin.updateUser(employee.auth_id, {
    email: employee.email,
    user_metadata: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position
    }
  });
  
  // Sync roles
  await syncAuthRoles(employee.auth_id, employee.roles);
}
```

### 2. Notification System

```typescript
async function notifyEmployeeChanges(
  employeeId: string,
  changes: Partial<Employee>
): Promise<void> {
  // Get relevant stakeholders
  const [employee, manager, hr] = await Promise.all([
    getEmployee(employeeId),
    getEmployeeManager(employeeId),
    getHRContacts()
  ]);
  
  // Create notifications
  const notifications = [
    {
      userId: employee.id,
      type: 'profile_update',
      message: 'Your profile has been updated'
    },
    {
      userId: manager.id,
      type: 'team_update',
      message: `${employee.firstName}'s profile has been updated`
    },
    ...hr.map(contact => ({
      userId: contact.id,
      type: 'employee_update',
      message: `Employee ${employee.firstName} ${employee.lastName} updated`
    }))
  ];
  
  // Send notifications
  await sendNotifications(notifications);
}
```

### 3. Reporting Integration

```typescript
async function generateEmployeeReport(
  filters: EmployeeFilters
): Promise<EmployeeReport> {
  // Get filtered employees
  const employees = await getFilteredEmployees(filters);
  
  // Get additional data
  const [timeData, ptoData, performanceData] = await Promise.all([
    getEmployeeTimeData(employees),
    getEmployeePTOData(employees),
    getEmployeePerformanceData(employees)
  ]);
  
  // Generate report
  return {
    employees,
    statistics: calculateStatistics(employees),
    timeTracking: summarizeTimeData(timeData),
    ptoUsage: summarizePTOData(ptoData),
    performance: summarizePerformanceData(performanceData)
  };
}
```

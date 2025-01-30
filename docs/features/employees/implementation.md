# Employee Management Implementation

## Code Organization

### Directory Structure
```
src/
├── components/employees/
│   ├── EmployeeForm.tsx
│   ├── EmployeeList.tsx
│   ├── EmployeeFilters.tsx
│   ├── ImportEmployeesModal.tsx
│   └── PTOManagement.tsx
├── contexts/
│   └── EmployeeContext.tsx
├── services/
│   └── employees.ts
├── utils/
│   └── csvParser.ts
└── pages/
    └── Employees.tsx
```

## State Management

### Employee Context
```typescript
interface EmployeeContextType {
  employees: Employee[];
  isLoading: boolean;
  error: Error | null;
  refreshEmployees: () => Promise<void>;
  createEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  importEmployees: (employees: Omit<Employee, 'id'>[]) => Promise<void>;
}
```

### State Updates
- Optimistic updates for better UX
- Error rollback handling
- Cache invalidation
- Real-time updates

## CSV Import Implementation

### CSV Parser
```typescript
export function parseCSV<T>(csvText: string): T[] {
  try {
    // Split into lines and remove empty lines
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    // Parse header row
    const headers = lines[0].split(',').map(header => 
      header.trim()
        .toLowerCase()
        .replace(/[\s-]/g, '_')
    );

    // Parse data rows
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(value => value.trim());
      
      if (values.length !== headers.length) {
        throw new Error(`Row ${index + 2} has ${values.length} columns but should have ${headers.length}`);
      }

      const row = {} as any;
      headers.forEach((header, i) => {
        const value = values[i] === '' ? null : values[i];
        row[header] = value;
      });

      return row;
    });
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw error;
  }
}
```

### Import Process
```typescript
async function importEmployees(
  organizationId: string,
  employees: Omit<Employee, 'id'>[]
): Promise<EmployeeResult[]> {
  try {
    // Check for existing employees
    const emails = employees.map(emp => emp.email);
    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('email')
      .in('email', emails);

    if (existingEmployees?.length > 0) {
      const duplicateEmails = existingEmployees.map(emp => emp.email);
      throw new Error(`The following employees already exist: ${duplicateEmails.join(', ')}`);
    }

    // Add organization data
    const employeesWithOrg = employees.map(employee => ({
      ...employee,
      organization_id: organizationId,
      status: employee.status || 'active',
      pto: {
        vacation: {
          beginningBalance: 0,
          ongoingBalance: 0,
          firstYearRule: 40,
          used: 0
        },
        sickLeave: {
          beginningBalance: 0,
          used: 0
        }
      }
    }));

    // Batch insert
    const { data, error } = await supabase
      .from('employees')
      .insert(employeesWithOrg)
      .select();

    if (error) throw error;
    return data.map(emp => ({ success: true, data: emp }));
  } catch (error) {
    return [{ success: false, error: error.message }];
  }
}
```

## Error Handling

### Validation Errors
```typescript
function validateEmployee(employee: any): employee is Employee {
  const requiredFields = ['first_name', 'last_name', 'email', 'role', 'start_date'];
  const missingFields = requiredFields.filter(field => !employee[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  if (!['admin', 'manager', 'employee'].includes(employee.role)) {
    throw new Error(`Invalid role: ${employee.role}`);
  }

  return true;
}
```

### Import Errors
- Pre-import validation
- Duplicate detection
- Format validation
- Role validation
- Date format validation

### Error Messages
- User-friendly messages
- Detailed error information
- Actionable feedback
- Error location identification

## Performance Considerations

### Batch Processing
- Bulk insert for imports
- Transaction management
- Error rollback

### Caching
- Context-level caching
- Optimistic updates
- Cache invalidation

### Query Optimization
- Indexed fields
- Filtered queries
- Pagination support

## Testing

### Unit Tests
- CSV parser tests
- Validation function tests
- Error handling tests

### Integration Tests
- Import process tests
- Database interaction tests
- Context update tests

### End-to-End Tests
- UI interaction tests
- Import workflow tests
- Error handling tests

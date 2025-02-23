import React, { useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { Button, LoadingSpinner } from '../design-system';
import { parseCSV } from '../../utils/csvParser';
import { useEmployees } from '../../contexts/EmployeeContext';
import { Employee } from '../../lib/types';
import { toast } from '../../lib/toast';

type EmployeeImport = Omit<Employee, 'id' | 'organization_id' | 'member_id'>;

/**
 * Button component for importing employees from CSV
 */
export default function ImportEmployeesButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { importEmployees } = useEmployees();

  const validateEmployee = (employee: any): employee is EmployeeImport => {
    const requiredFields = ['first_name', 'last_name', 'email', 'role', 'start_date'];
    const missingFields = requiredFields.filter(field => !employee[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate role
    if (!['admin', 'manager', 'employee'].includes(employee.role)) {
      throw new Error(`Invalid role for employee ${employee.email}: ${employee.role}`);
    }

    // Validate status if provided
    if (employee.status && !['active', 'inactive'].includes(employee.status)) {
      throw new Error(`Invalid status for employee ${employee.email}: ${employee.status}`);
    }

    // Validate date format
    try {
      new Date(employee.start_date).toISOString();
    } catch {
      throw new Error(`Invalid start_date for employee ${employee.email}: ${employee.start_date}`);
    }

    return true;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Reading file:', file.name);
      const text = await file.text();
      console.log('File content:', text);
      
      const employees = parseCSV<any>(text);
      console.log('Parsed employees:', employees);

      // Validate each employee
      const validEmployees: EmployeeImport[] = [];
      const errors: string[] = [];

      employees.forEach((emp, index) => {
        try {
          console.log('Validating employee:', emp);
          if (validateEmployee(emp)) {
            // Set default values for optional fields
            validEmployees.push({
              ...emp,
              phone: emp.phone || undefined,
              department: emp.department || '',
              status: emp.status || 'active',
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
            });
          }
        } catch (error) {
          console.error('Validation error for row', index + 2, error);
          errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      });

      if (errors.length > 0) {
        throw new Error(`Validation errors:\n${errors.join('\n')}`);
      }

      if (validEmployees.length === 0) {
        throw new Error('No valid employees found in the CSV file');
      }

      console.log('Valid employees to import:', validEmployees);
      await importEmployees(validEmployees);
      
      toast({
        title: 'Success',
        description: `Successfully imported ${validEmployees.length} employees`,
        variant: 'default'
      });
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing employees:', error);
      toast({
        title: 'Error importing employees',
        description: error instanceof Error ? error.message : 'Please check the file format and try again',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Prevent default if template doesn't exist
    if (!fetch('/employee_template.csv').then(res => res.ok)) {
      e.preventDefault();
      toast({
        title: 'Error',
        description: 'Template file not found. Please contact support.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="secondary"
        onClick={() => window.location.href = '/employee_template.csv'}
        leftIcon={<Download className="h-4 w-4" />}
      >
        Download Template
      </Button>

      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Import employees from CSV"
      />

      <Button
        variant="primary"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        leftIcon={isLoading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
      >
        {isLoading ? 'Importing...' : 'Import Employees'}
      </Button>
    </div>
  );
}

import React, { useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { Button, Modal, LoadingSpinner } from '../design-system';
import { parseCSV } from '../../utils/csvParser';
import { Employee } from '../../lib/types';
import { toast } from '../../lib/toast';

type EmployeeImport = Omit<Employee, 'id' | 'organization_id' | 'member_id'>;

interface ImportEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (employees: EmployeeImport[]) => Promise<void>;
}

export default function ImportEmployeesModal({ isOpen, onClose, onImport }: ImportEmployeesModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmployee = (employee: any): employee is EmployeeImport => {
    console.log('Validating employee:', employee);
    
    const requiredFields = ['first_name', 'last_name', 'email', 'role', 'start_date'];
    const missingFields = requiredFields.filter(field => !employee[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate role
    if (!['admin', 'manager', 'employee'].includes(employee.role)) {
      throw new Error(`Invalid role for employee ${employee.email}: ${employee.role}. Must be one of: admin, manager, employee`);
    }

    // Validate status if provided
    if (employee.status && !['active', 'inactive'].includes(employee.status)) {
      throw new Error(`Invalid status for employee ${employee.email}: ${employee.status}. Must be one of: active, inactive`);
    }

    // Validate date format
    try {
      const date = new Date(employee.start_date);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid start_date format for employee ${employee.email}: ${employee.start_date}. Use YYYY-MM-DD format`);
      }
    } catch {
      throw new Error(`Invalid start_date for employee ${employee.email}: ${employee.start_date}. Use YYYY-MM-DD format`);
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
        throw new Error(`Failed to import employees:\n${errors.join('\n')}`);
      }

      if (validEmployees.length === 0) {
        throw new Error('No valid employees found in the CSV file. Please check the file format and try again.');
      }

      console.log('Valid employees to import:', validEmployees);
      await onImport(validEmployees);
      
      toast({
        title: 'Success',
        description: `Successfully imported ${validEmployees.length} employees`,
        variant: 'default'
      });
      
      // Reset the file input and close the modal
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
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

  const handleDownloadTemplate = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      const response = await fetch('/employee_template.csv');
      if (!response.ok) {
        e.preventDefault();
        toast({
          title: 'Error',
          description: 'Template file not found. Please contact support.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      e.preventDefault();
      toast({
        title: 'Error',
        description: 'Failed to check template file. Please try again later.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Employees"
    >
      <div className="space-y-6">
        <div className="text-sm text-neutral-500">
          <p>Upload a CSV file containing employee information.</p>
          <p className="mt-2">
            Make sure to follow the template format. You can download the template below.
          </p>
        </div>

        <div className="flex flex-col gap-4">
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
            fullWidth
          >
            {isLoading ? 'Importing...' : 'Select CSV File'}
          </Button>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
import React, { useState } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import type { EmployeeImport } from '../../lib/types';

interface ImportEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (employees: EmployeeImport[]) => void;
}

export default function ImportEmployeesModal({ isOpen, onClose, onImport }: ImportEmployeesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'role',
      'department',
      'start_date',
      'sick_leave_beginning_balance',
      'vacation_beginning_balance'
    ];
    const sampleData = [
      'John,Doe,john@example.com,123-456-7890,employee,Sales,2024-01-15,0,0',
      'Jane,Smith,jane@example.com,123-456-7891,manager,Engineering,2023-12-01,8,24'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'employee_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    setError(null);
    
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].toLowerCase().split(',');
      
      console.log('Headers:', headers); // Debug headers
      
      const employees: EmployeeImport[] = lines
        .slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',');
          
          // Debug values
          console.log('Row values:', values);
          console.log('Sick leave index:', headers.indexOf('sick_leave_beginning_balance'));
          console.log('Sick leave value:', values[headers.indexOf('sick_leave_beginning_balance')]);
          
          const employee = {
            first_name: values[headers.indexOf('first_name')].trim(),
            last_name: values[headers.indexOf('last_name')].trim(),
            email: values[headers.indexOf('email')].trim(),
            phone: values[headers.indexOf('phone')]?.trim(),
            role: values[headers.indexOf('role')].trim() as EmployeeImport['role'],
            department: values[headers.indexOf('department')]?.trim(),
            startDate: values[headers.indexOf('start_date')]?.trim(),
            pto: {
              vacation: {
                beginningBalance: Number(values[headers.indexOf('vacation_beginning_balance')]?.trim() || '0'),
                ongoingBalance: 0,
                firstYearRule: 40
              },
              sickLeave: {
                beginningBalance: Number(values[headers.indexOf('sick_leave_beginning_balance')]?.trim() || '0')
              }
            }
          };
          
          // Debug final employee object
          console.log('Created employee:', employee);
          return employee;
        });

      // Debug final employees array
      console.log('Final employees array:', employees);

      // Validate employees
      const errors = employees.flatMap((emp, index) => {
        const validationErrors = [];
        if (!emp.first_name) validationErrors.push(`Row ${index + 2}: First name is required`);
        if (!emp.last_name) validationErrors.push(`Row ${index + 2}: Last name is required`);
        if (!emp.email) validationErrors.push(`Row ${index + 2}: Email is required`);
        if (!['admin', 'manager', 'employee'].includes(emp.role)) {
          validationErrors.push(`Row ${index + 2}: Invalid role`);
        }
        
        // Validate start date
        if (emp.startDate) {
          const startDate = new Date(emp.startDate);
          if (isNaN(startDate.getTime())) {
            validationErrors.push(`Row ${index + 2}: Invalid start date format. Use YYYY-MM-DD`);
          }
        }
        
        // Validate PTO balances
        const sickLeaveBalance = emp.pto?.sickLeave?.beginningBalance;
        if (sickLeaveBalance !== undefined && (isNaN(sickLeaveBalance) || sickLeaveBalance < 0)) {
          validationErrors.push(`Row ${index + 2}: Invalid sick leave balance. Must be a non-negative number`);
        }
        
        const vacationBalance = emp.pto?.vacation?.beginningBalance;
        if (vacationBalance !== undefined && (isNaN(vacationBalance) || vacationBalance < 0)) {
          validationErrors.push(`Row ${index + 2}: Invalid vacation balance. Must be a non-negative number`);
        }
        
        return validationErrors;
      });

      if (errors.length > 0) {
        setError(`Validation errors:\n${errors.join('\n')}`);
        return;
      }

      onImport(employees);
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to parse CSV file. Please check the format.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Import Employees</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <button
              onClick={downloadTemplate}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center cursor-pointer"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Click to select CSV file'}
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-2" />
                <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
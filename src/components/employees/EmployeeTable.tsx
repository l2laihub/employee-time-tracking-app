import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Mail, Phone, Calendar, Briefcase, Stethoscope } from 'lucide-react';
import { Table, Badge, Button, LoadingSpinner } from '../design-system';
import type { Column } from '../design-system/Table';
import EmployeeCard from './EmployeeCard';
import EmployeeStartDateForm from '../pto/EmployeeStartDateForm';
import { usePTO } from '../../contexts/PTOContext';
import type { Employee, SortConfig } from '../../lib/types';
import { formatDateForDisplay } from '../../utils/dateUtils';

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onUpdateStartDate: (employeeId: string, startDate: string) => void;
  sortConfig: SortConfig;
  onSort: (column: SortConfig['column']) => void;
}

type ColumnKey = SortConfig['column'] | 'contact' | 'pto' | 'actions';

export default function EmployeeTable({ 
  employees, 
  onEdit, 
  onDelete, 
  onUpdateStartDate,
  sortConfig,
  onSort 
}: EmployeeTableProps) {
  const { getPTOBalance } = usePTO();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [balances, setBalances] = useState<Record<string, { vacation: number; sick_leave: number }>>({});
  const [loadingBalances, setLoadingBalances] = useState(true);

  useEffect(() => {
    async function loadBalances() {
      setLoadingBalances(true);
      const newBalances: Record<string, { vacation: number; sick_leave: number }> = {};
      
      for (const employee of employees) {
        try {
          const [vacationBalance, sickLeaveBalance] = await Promise.all([
            getPTOBalance(employee, 'vacation'),
            getPTOBalance(employee, 'sick_leave')
          ]);
          newBalances[employee.id] = {
            vacation: vacationBalance,
            sick_leave: sickLeaveBalance
          };
        } catch (error) {
          console.error(`Failed to load PTO balance for employee ${employee.id}:`, error);
          newBalances[employee.id] = { vacation: 0, sick_leave: 0 };
        }
      }
      
      setBalances(newBalances);
      setLoadingBalances(false);
    }
    loadBalances();
  }, [employees, getPTOBalance]);

  const columns: Column<Employee, ColumnKey>[] = [
    {
      key: 'name',
      header: 'Employee',
      sortable: true,
      render: (employee) => (
        <div>
          <div className="font-medium text-neutral-900">
            {employee.first_name} {employee.last_name}
          </div>
          <div className="text-sm text-neutral-500">
            {employee.role}
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (employee) => (
        <div className="flex flex-col text-sm text-neutral-500">
          <div className="flex items-center">
            <Mail className="w-4 h-4 mr-1" />
            {employee.email}
          </div>
          {employee.phone && (
            <div className="flex items-center mt-1">
              <Phone className="w-4 h-4 mr-1" />
              {employee.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (employee) => (
        <div>
          <div className="text-neutral-900">{employee.department}</div>
          <div className="flex items-center text-sm text-neutral-500">
            <Calendar className="w-4 h-4 mr-1" />
            {employee.start_date 
              ? `Started ${formatDateForDisplay(employee.start_date)}`
              : 'Start date not set'
            }
          </div>
        </div>
      )
    },
    {
      key: 'pto',
      header: 'PTO Balances',
      render: (employee) => (
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Briefcase className="w-4 h-4 text-primary-500 mr-1" />
            <span>
              Vacation: {loadingBalances ? '...' : `${balances[employee.id]?.vacation || 0} hrs`}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <Stethoscope className="w-4 h-4 text-success-500 mr-1" />
            <span>
              Sick Leave: {loadingBalances ? '...' : `${balances[employee.id]?.sick_leave || 0} hrs`}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (employee) => (
        <Badge
          variant={employee.status === 'active' ? 'success' : 'error'}
          size="sm"
        >
          {employee.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (employee) => (
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(employee)}
            leftIcon={<Edit2 className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="!text-error-600 !border-error-600 hover:!bg-error-50"
            onClick={() => onDelete(employee.id)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  if (loadingBalances) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table<Employee, ColumnKey>
          columns={columns}
          data={employees}
          keyExtractor={(employee) => employee.id}
          sortConfig={{
            key: sortConfig.column as ColumnKey,
            direction: sortConfig.direction
          }}
          onSort={(key) => {
            if (key === 'name' || key === 'department' || key === 'status') {
              onSort(key);
            }
          }}
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {employees.map(employee => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            vacationBalance={balances[employee.id]?.vacation || 0}
            sickLeaveBalance={balances[employee.id]?.sick_leave || 0}
            loadingBalances={loadingBalances}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {editingEmployee && (
        <EmployeeStartDateForm
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSubmit={(startDate) => {
            onUpdateStartDate(editingEmployee.id, startDate);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}

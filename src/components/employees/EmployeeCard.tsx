import React from 'react';
import { Mail, Phone, Calendar, Clock, Briefcase, Stethoscope, Edit2, Trash2 } from 'lucide-react';
import { Card, Badge, Button } from '../design-system';
import type { Employee } from '../../lib/types';
import { formatDateForDisplay } from '../../utils/dateUtils';

interface EmployeeCardProps {
  /**
   * Employee data to display
   */
  employee: Employee;

  /**
   * PTO balance for vacation hours
   */
  vacationBalance: number;

  /**
   * PTO balance for sick leave hours
   */
  sickLeaveBalance: number;

  /**
   * Whether PTO balances are loading
   */
  loadingBalances?: boolean;

  /**
   * Callback when edit button is clicked
   */
  onEdit: (employee: Employee) => void;

  /**
   * Callback when delete button is clicked
   */
  onDelete: (id: string) => void;
}

/**
 * Card component for displaying employee information on mobile
 */
export default function EmployeeCard({
  employee,
  vacationBalance,
  sickLeaveBalance,
  loadingBalances,
  onEdit,
  onDelete
}: EmployeeCardProps) {
  return (
    <Card className={employee.status === 'inactive' ? 'bg-neutral-50' : undefined}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-neutral-900">
            {employee.first_name} {employee.last_name}
          </h3>
          <p className="text-sm text-neutral-500">{employee.role}</p>
        </div>
        <Badge
          variant={employee.status === 'active' ? 'success' : 'error'}
          size="sm"
        >
          {employee.status}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-sm text-neutral-500">
          <Mail className="w-4 h-4 mr-2" />
          <span className="truncate">{employee.email}</span>
        </div>
        
        {employee.phone && (
          <div className="flex items-center text-sm text-neutral-500">
            <Phone className="w-4 h-4 mr-2" />
            {employee.phone}
          </div>
        )}
        
        <div className="flex items-center text-sm text-neutral-500">
          <Briefcase className="w-4 h-4 mr-2" />
          {employee.department}
        </div>
        
        <div className="flex items-center text-sm text-neutral-500">
          <Calendar className="w-4 h-4 mr-2" />
          {employee.start_date 
            ? `Started ${formatDateForDisplay(employee.start_date)}`
            : 'Start date not set'
          }
        </div>
        
        <div className="flex items-center text-sm text-neutral-500">
          <Clock className="w-4 h-4 text-primary-500 mr-2" />
          <span>
            Vacation: {loadingBalances ? '...' : `${vacationBalance} hrs`}
          </span>
        </div>
        
        <div className="flex items-center text-sm text-neutral-500">
          <Stethoscope className="w-4 h-4 text-success-500 mr-2" />
          <span>
            Sick Leave: {loadingBalances ? '...' : `${sickLeaveBalance} hrs`}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={() => onEdit(employee)}
          leftIcon={<Edit2 className="w-4 h-4" />}
        >
          Edit
        </Button>
        <Button
          variant="secondary"
          className="!text-error-600 !border-error-600 hover:!bg-error-50"
          onClick={() => onDelete(employee.id)}
          leftIcon={<Trash2 className="w-4 h-4" />}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}
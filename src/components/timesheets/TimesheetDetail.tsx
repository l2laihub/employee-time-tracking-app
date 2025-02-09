import React from 'react';
import { format } from 'date-fns';
import { FileText, Check, X, Clock } from 'lucide-react';
import type { Timesheet } from '../../types/custom.types';
import { useEmployees } from '../../contexts/EmployeeContext';

interface TimesheetDetailProps {
  timesheet: Timesheet;
  onClose: () => void;
  isAdmin: boolean;
  onUpdateStatus?: (status: 'approved' | 'rejected', notes?: string) => Promise<void>;
}

export default function TimesheetDetail({ timesheet, onClose, isAdmin, onUpdateStatus }: TimesheetDetailProps) {
  const { employees } = useEmployees();
  const [reviewNotes, setReviewNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleStatusUpdate = async (status: 'approved' | 'rejected') => {
    if (!onUpdateStatus) return;
    
    try {
      setIsSubmitting(true);
      await onUpdateStatus(status, reviewNotes);
      onClose();
    } catch (error) {
      console.error('Failed to update timesheet status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: Timesheet['status']) => {
    switch (status) {
      case 'approved':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <X className="w-5 h-5 text-red-500" />;
      case 'submitted':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusClass = (status: Timesheet['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Timesheet Details</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Employee</p>
            <p className="font-medium">{getEmployeeName(timesheet.employee_id)}</p>
          </div>
          <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${getStatusClass(timesheet.status)}`}>
            {getStatusIcon(timesheet.status)}
            <span className="capitalize">{timesheet.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Period Start</p>
            <p className="font-medium">{format(new Date(timesheet.period_start_date), 'MMM dd, yyyy')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Period End</p>
            <p className="font-medium">{format(new Date(timesheet.period_end_date), 'MMM dd, yyyy')}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-500">Total Hours</p>
          <p className="font-medium">{timesheet.total_hours}</p>
        </div>

        {timesheet.review_notes && (
          <div>
            <p className="text-sm text-gray-500">Review Notes</p>
            <p className="mt-1 text-gray-700 bg-gray-50 p-3 rounded-md">{timesheet.review_notes}</p>
          </div>
        )}

        {timesheet.reviewed_by && (
          <div>
            <p className="text-sm text-gray-500">Reviewed By</p>
            <p className="font-medium">{getEmployeeName(timesheet.reviewed_by)}</p>
            <p className="text-sm text-gray-500">
              {timesheet.reviewed_at && format(new Date(timesheet.reviewed_at), 'MMM dd, yyyy HH:mm')}
            </p>
          </div>
        )}
      </div>

      {isAdmin && timesheet.status === 'submitted' && (
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="review-notes" className="block text-sm font-medium text-gray-700">
              Review Notes
            </label>
            <textarea
              id="review-notes"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any notes about this timesheet..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => handleStatusUpdate('rejected')}
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => handleStatusUpdate('approved')}
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { PTORequest } from '../../lib/types';
import { Calendar, Clock, Edit2, User, Briefcase, Stethoscope, Timer, Trash2 } from 'lucide-react';
import { useEmployees } from '../../contexts/EmployeeContext';

interface PTORequestListProps {
  requests: PTORequest[];
  onReview?: (request: PTORequest) => void;
  onEdit?: (request: PTORequest) => void;
  onDelete?: (requestId: string) => void;
  isAdmin?: boolean;
}

export default function PTORequestList({ requests, onReview, onEdit, onDelete, isAdmin }: PTORequestListProps) {
  console.log('PTORequestList rendering:', {
    requestsCount: requests.length,
    isAdmin,
    requestDetails: requests.map(r => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      type: r.type,
      startDate: r.startDate,
      endDate: r.endDate,
      hours: r.hours
    }))
  });

  useEffect(() => {
    console.log('PTORequestList mounted/updated with requests:', {
      count: requests.length,
      hasRequests: requests.length > 0,
      firstRequest: requests[0] ? {
        id: requests[0].id,
        status: requests[0].status
      } : null
    });
  }, [requests]);
  const getStatusBadge = (status: PTORequest['status']) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  const getEmployeeName = (request: PTORequest) => {
    if (!request.employee) return 'Unknown Employee';
    
    const name = `${request.employee.firstName} ${request.employee.lastName}`;
    if (request.createdBy) {
      // If the request was created by someone else (admin/manager), show that info
      if (request.employee.role === 'admin' || request.employee.role === 'manager') {
        return `${name} (Request by ${request.employee.role === 'admin' ? 'Admin' : 'Manager'})`;
      }
    }
    return name;
  };

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between">
            <div className="space-y-2 mb-4 sm:mb-0">
              {isAdmin && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <User className="w-4 h-4" />
                  <span>{getEmployeeName(request)}</span>
                </div>
              )}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    {format(new Date(request.startDate), 'MMM d, yyyy')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">{request.hours} hours</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                {request.type === 'vacation' ? (
                  <Briefcase className="w-4 h-4 text-blue-500" />
                ) : (
                  <Stethoscope className="w-4 h-4 text-green-500" />
                )}
                <span className="text-sm font-medium capitalize">
                  {request.type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600">{request.reason}</p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Requested {format(new Date(request.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:space-y-2">
              {getStatusBadge(request.status)}
              <div className="flex space-x-2 mt-2 sm:mt-0">
                {!isAdmin && request.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onEdit?.(request)}
                      className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this PTO request?')) {
                          onDelete?.(request.id);
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-800 flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </>
                )}
                {isAdmin && request.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onReview?.(request)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Review Request
                    </button>
                    {/* Show delete button for admin-created requests */}
                    {request.createdBy && (() => {
                      const { employees } = useEmployees();
                      const creator = employees.find(emp => emp.id === request.createdBy);
                      return creator && (creator.role === 'admin' || creator.role === 'manager');
                    })() && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this admin-created PTO request?')) {
                            onDelete?.(request.id);
                          }
                        }}
                        className="text-sm text-red-600 hover:text-red-800 flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

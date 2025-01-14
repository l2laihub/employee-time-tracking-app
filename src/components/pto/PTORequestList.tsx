import React from 'react';
import { format } from 'date-fns';
import { PTORequest } from '../../lib/types';
import { Calendar, Clock, Edit2, User, Briefcase, Stethoscope, Timer } from 'lucide-react';
import { mockUsers } from '../../lib/mockUsers';

interface PTORequestListProps {
  requests: PTORequest[];
  onReview?: (request: PTORequest) => void;
  onEdit?: (request: PTORequest) => void;
  isAdmin?: boolean;
}

export default function PTORequestList({ requests, onReview, onEdit, isAdmin }: PTORequestListProps) {
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

  const getEmployeeName = (userId: string, createdBy?: string) => {
    const employee = mockUsers.find(user => user.id === userId);
    if (!employee) return 'Unknown Employee';
    
    const name = `${employee.first_name} ${employee.last_name}`;
    if (createdBy) {
      const creator = mockUsers.find(user => user.id === createdBy);
      if (creator && (creator.role === 'admin' || creator.role === 'manager')) {
        return `${name} (Request by ${creator.role === 'admin' ? 'Admin' : 'Manager'})`;
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
                  <span>{getEmployeeName(request.userId, request.createdBy)}</span>
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
              {request.notes && (
                <p className="text-sm text-gray-500 italic">Note: {request.notes}</p>
              )}
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Requested {format(new Date(request.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:space-y-2">
              {getStatusBadge(request.status)}
              <div className="flex space-x-2 mt-2 sm:mt-0">
                {!isAdmin && request.status === 'pending' && (
                  <button
                    onClick={() => onEdit?.(request)}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                )}
                {isAdmin && request.status === 'pending' && (
                  <button
                    onClick={() => onReview?.(request)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Review Request
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

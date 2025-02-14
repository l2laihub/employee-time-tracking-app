import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Filter } from 'lucide-react';
import PTORequestForm from '../components/pto/PTORequestForm';
import PTORequestList from '../components/pto/PTORequestList';
import PTOReviewForm from '../components/pto/PTOReviewForm';
import { useEmployees } from '../contexts/EmployeeContext';
import { usePTO } from '../contexts/PTOContext';
import { useOrganization } from '../contexts/OrganizationContext';
import type { PTORequest, PTOType, Employee } from '../lib/types';
import UserPTOBalance from '../components/pto/UserPTOBalance';
import toast from 'react-hot-toast';

export default function PTO() {
  console.log('PTO page mounting');
  const { user } = useAuth();
  const { requests, addPTORequest, updatePTORequest, deletePTORequest, loading, error } = usePTO();

  // Debug mount with context values
  useEffect(() => {
    console.log('PTO page mounted with context:', {
      hasUser: !!user,
      userId: user?.id,
      requestsLoading: loading,
      requestsCount: requests?.length || 0,
      error
    });
  }, [user, loading, requests, error]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PTORequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<PTORequest | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
    employee: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const filteredRequests = useMemo(() => {
    console.log('Filtering requests:', {
      total: requests.length,
      isAdmin,
      userId: user?.id,
      filters,
      requestDetails: requests.map(r => ({
        id: r.id,
        userId: r.userId,
        status: r.status,
        type: r.type
      }))
    });

    console.log('User filter details:', {
      requestUserIds: requests.map(r => r.userId),
      currentUserId: user?.id,
      isAdmin
    });

    let filtered = isAdmin ? requests : requests.filter(r => {
      const matches = r.userId === selectedEmployee?.id;
      console.log('Request filter check:', {
        requestId: r.id,
        requestUserId: r.userId,
        employeeId: selectedEmployee?.id,
        matches
      });
      return matches;
    });

    // Apply status and type filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter(r => r.type === filters.type);
    }

    // Apply date range filter
    if (filters.startDate) {
      filtered = filtered.filter(r => r.startDate >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(r => r.endDate <= filters.endDate);
    }

    // Apply employee filter (admin only)
    if (isAdmin && filters.employee !== 'all') {
      filtered = filtered.filter(r => r.userId === filters.employee);
    }

    console.log('Filtered requests:', {
      beforeFilter: requests.length,
      afterFilter: filtered.length,
      userFilter: isAdmin ? 'none' : `userId=${user?.id}`,
      statusFilter: filters.status,
      typeFilter: filters.type,
      dateFilter: filters.startDate || filters.endDate ? 'yes' : 'no'
    });

    return filtered;
  }, [requests, filters, isAdmin, selectedEmployee?.id]);

  const { employees, isLoading: employeesLoading } = useEmployees();
  const { organization, isLoading: orgLoading } = useOrganization();
  const employeeOptions = useMemo(() => {
    if (!isAdmin) return [];
    const uniqueEmployeeIds = [...new Set(requests.map(r => r.userId))];
    return uniqueEmployeeIds.map(id => {
      const employee = employees.find(u => u.id === id);
      return {
        id,
        name: employee ? `${employee.first_name} ${employee.last_name}` : id
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [requests, isAdmin]);

  // Set selected employee for non-admin users
  useEffect(() => {
    if (!isAdmin && user && employees.length > 0) {
      const userEmployee = employees.find(emp => emp.email === user.email);
      if (userEmployee) {
        console.log('Setting selected employee for non-admin user:', {
          id: userEmployee.id,
          name: `${userEmployee.first_name} ${userEmployee.last_name}`
        });
        setSelectedEmployee(userEmployee);
      }
    }
  }, [isAdmin, user, employees]);


  const handleCreateRequest = async (data: {
    startDate: string;
    endDate: string;
    type: PTOType;
    hours: number;
    reason: string;
    userId: string;
    createdBy?: string;
  }) => {
    try {
      const result = await addPTORequest({
        userId: data.userId,
        startDate: data.startDate,
        endDate: data.endDate,
        type: data.type,
        hours: data.hours,
        reason: data.reason,
        createdBy: data.createdBy
      });

      if (result.success) {
        setShowRequestForm(false);
        toast.success('PTO request submitted successfully');
      } else {
        toast.error(result.error || 'Failed to submit PTO request');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit PTO request';
      toast.error(errorMessage);
    }
  };

  const handleEditRequest = async (data: {
    startDate: string; 
    endDate: string; 
    type: PTOType; 
    hours: number; 
    reason: string;
    userId: string;
    createdBy?: string;
  }) => {
    if (!editingRequest) return;

    try {
      await addPTORequest({
        userId: data.userId,
        startDate: data.startDate,
        endDate: data.endDate,
        type: data.type,
        hours: data.hours,
        reason: data.reason,
        createdBy: data.createdBy
      });
      setEditingRequest(null);
      toast.success('PTO request updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update PTO request';
      toast.error(errorMessage);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await deletePTORequest(requestId);
      toast.success('PTO request deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete PTO request';
      toast.error(errorMessage);
    }
  };

  const handleReviewRequest = async (data: { status: 'approved' | 'rejected'; notes: string }) => {
    if (!selectedRequest || !user) return;

    try {
      await updatePTORequest(selectedRequest.id, data.status, user.id);
      setSelectedRequest(null);
      toast.success(`PTO request ${data.status}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update PTO request';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">PTO Requests</h1>
          <p className="text-sm text-gray-600">
            {isAdmin ? 'Manage team PTO requests' : 'Request and track your time off'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
          {!editingRequest && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Request PTO
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="vacation">Vacation</option>
                  <option value="sick_leave">Sick Leave</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={filters.employee}
                  onChange={(e) => setFilters(prev => ({ ...prev, employee: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Employees</option>
                  {employeeOptions.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {(showRequestForm || editingRequest) && (
        <div className="mb-6 bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingRequest ? 'Edit PTO Request' : 'New PTO Request'}
          </h2>
          {/* Show PTO balance if we have a selected employee (admin mode) or found the user's employee record */}
          {selectedEmployee && (
            <UserPTOBalance user={selectedEmployee} />
          )}
          {/* Debug employee selection */}
          <div className="text-xs text-gray-500 mt-2">
            <div>Organization: {organization?.id || 'None'}</div>
            <div>
              Debug: {
                isAdmin 
                  ? `Admin mode - Selected: ${selectedEmployee?.first_name || 'None'}`
                  : `Employee mode - User ID: ${user?.id || 'No user'}`
              }
            </div>
            <div>Loading employees: {employeesLoading ? 'Yes' : 'No'}</div>
            <div>Total employees: {employees.length}</div>
            <div>
              Found in employees: {user ? employees.find(u => u.email === user.email)?.first_name || 'Not found' : 'No user'}
            </div>
            <div>Employee IDs: {employees.map(e => e.id).join(', ')}</div>
            <div>
              Auth user metadata: {JSON.stringify(user?.user_metadata || {})}
            </div>
          </div>
          <PTORequestForm
            onSubmit={editingRequest ? handleEditRequest : handleCreateRequest}
            onCancel={() => {
              setShowRequestForm(false);
              setEditingRequest(null);
            }}
            initialData={editingRequest || undefined}
            isEdit={!!editingRequest}
            onEmployeeSelect={setSelectedEmployee}
          />
        </div>
      )}

      {(loading || orgLoading) ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <p>{error}</p>
        </div>
      ) : (
        <PTORequestList
          requests={filteredRequests}
          onReview={setSelectedRequest}
          onEdit={setEditingRequest}
          onDelete={handleDeleteRequest}
          isAdmin={isAdmin}
        />
      )}

      {selectedRequest && (
        <PTOReviewForm
          request={selectedRequest}
          onSubmit={handleReviewRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}

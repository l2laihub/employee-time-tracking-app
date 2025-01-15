import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Filter } from 'lucide-react';
import PTORequestForm from '../components/pto/PTORequestForm';
import PTORequestList from '../components/pto/PTORequestList';
import PTOReviewForm from '../components/pto/PTOReviewForm';
import { mockPTORequests } from '../lib/mockPTOData';
import { useEmployees } from '../contexts/EmployeeContext';
import type { PTORequest, PTOType, Employee } from '../lib/types';
import UserPTOBalance from '../components/pto/UserPTOBalance';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function PTO() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(mockPTORequests);
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
    let filtered = isAdmin ? requests : requests.filter(r => r.userId === user?.id);

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

    return filtered;
  }, [requests, filters, isAdmin, user?.id]);

  const { employees } = useEmployees();
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

  const handleCreateRequest = (data: { 
    startDate: string; 
    endDate: string; 
    type: PTOType; 
    hours: number; 
    reason: string;
    userId: string;
    createdBy?: string;
  }) => {
    const newRequest: PTORequest = {
      id: `pto-${Date.now()}`,
      userId: data.userId,
      startDate: data.startDate,
      endDate: data.endDate,
      type: data.type,
      hours: data.hours,
      reason: data.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy
    };
    
    setRequests([newRequest, ...requests]);
    setShowRequestForm(false);
    toast.success('PTO request submitted successfully');
  };

  const handleEditRequest = (data: { 
    startDate: string; 
    endDate: string; 
    type: PTOType; 
    hours: number; 
    reason: string;
    userId: string;
    createdBy?: string;
  }) => {
    if (!editingRequest) return;

    const updatedRequests = requests.map(req =>
      req.id === editingRequest.id
        ? {
            ...req,
            startDate: data.startDate,
            endDate: data.endDate,
            type: data.type,
            hours: data.hours,
            reason: data.reason,
            userId: data.userId,
            createdBy: data.createdBy || req.createdBy // Maintain original createdBy if not provided
          }
        : req
    );

    setRequests(updatedRequests);
    setEditingRequest(null);
    toast.success('PTO request updated successfully');
  };

  const handleReviewRequest = (data: { status: 'approved' | 'rejected'; notes: string }) => {
    if (!selectedRequest || !user) return;

    const updatedRequests = requests.map(req =>
      req.id === selectedRequest.id
        ? {
            ...req,
            status: data.status,
            notes: data.notes,
            reviewedBy: user.id,
            reviewedAt: new Date().toISOString()
          }
        : req
    );

    setRequests(updatedRequests);
    setSelectedRequest(null);
    toast.success(`PTO request ${data.status}`);
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
          {user && (
            <UserPTOBalance 
              user={
                isAdmin 
                  ? (editingRequest 
                      ? employees.find(u => u.id === editingRequest.userId) as Employee
                      : selectedEmployee || (employees.find(u => u.id === user.id) as Employee))
                  : employees.find(u => u.id === user.id) as Employee
              } 
            />
          )}
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

      <PTORequestList
        requests={filteredRequests}
        onReview={setSelectedRequest}
        onEdit={setEditingRequest}
        isAdmin={isAdmin}
      />

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

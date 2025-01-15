import React, { useState } from 'react';
import { TimesheetEntry } from '../../lib/types';
import TimesheetList from './TimesheetList';
import TimesheetReviewForm from './TimesheetReviewForm';
import { Search, Calendar, Building2, CheckCircle, X } from 'lucide-react';
import { mockUsers } from '../../lib/mockUsers';

interface AdminTimesheetViewProps {
  timesheets: TimesheetEntry[];
  onUpdateTimesheet: (timesheet: TimesheetEntry) => void;
}

interface TimesheetFilters {
  search: string;
  status: string;
  department: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

  const initialFilters: TimesheetFilters = {
    search: '',
    status: '',
    department: '',
    dateRange: {
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  };

export default function AdminTimesheetView({ timesheets, onUpdateTimesheet }: AdminTimesheetViewProps) {
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetEntry | null>(null);
  const [filters, setFilters] = useState<TimesheetFilters>(initialFilters);

  // Get pending timesheets count
  const pendingCount = timesheets.filter(t => t.status === 'submitted').length;

  const filteredTimesheets = timesheets
    .map(timesheet => {
      const employee = mockUsers.find(user => user.id === timesheet.userId);
      if (!employee) return null;

      // Add employee name to timesheet data
      const enhancedTimesheet: TimesheetEntry = {
        ...timesheet,
        employeeName: `${employee.first_name} ${employee.last_name}`
      };

      // Search filter
      const searchLower = filters.search.toLowerCase();
      const employeeName = enhancedTimesheet.employeeName.toLowerCase();
      const matchesSearch = !filters.search || 
        employeeName.includes(searchLower) ||
        timesheet.id.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = !filters.status || 
        (filters.status === 'Pending Review'
          ? ['pending', 'submitted'].includes(timesheet.status)
          : timesheet.status === filters.status);

      // Department filter
      const matchesDepartment = !filters.department || employee.department === filters.department;

      // Date range filter
      const weekStartDate = new Date(timesheet.weekStartDate);
      const weekEndDate = new Date(timesheet.weekEndDate);
      const startDate = new Date(filters.dateRange.startDate);
      const endDate = new Date(filters.dateRange.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Check if the timesheet week overlaps with the selected date range
      const matchesDateRange = (
        (weekStartDate <= endDate && weekEndDate >= startDate) ||
        (weekStartDate >= startDate && weekStartDate <= endDate) ||
        (weekEndDate >= startDate && weekEndDate <= endDate)
      );

      return matchesSearch && matchesStatus && matchesDepartment && matchesDateRange 
        ? enhancedTimesheet 
        : null;
    })
    .filter((timesheet): timesheet is TimesheetEntry => timesheet !== null);

  const departments = Array.from(new Set(mockUsers.map(user => user.department))).filter(Boolean);

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters = 
    filters.search !== initialFilters.search ||
    filters.status !== initialFilters.status ||
    filters.department !== initialFilters.department ||
    filters.dateRange.startDate !== initialFilters.dateRange.startDate ||
    filters.dateRange.endDate !== initialFilters.dateRange.endDate;

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timesheet Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review and manage employee timesheets
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              {pendingCount} Pending Review
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-medium text-gray-700">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </button>
          )}
        </div>

        {/* Search and Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search employee..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Status */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CheckCircle className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Department */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filters.dateRange.startDate}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, startDate: e.target.value }
                }))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filters.dateRange.endDate}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, endDate: e.target.value }
                }))}
                min={filters.dateRange.startDate}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      {filteredTimesheets.length < timesheets.length && (
        <p className="text-sm text-gray-500 mb-4">
          Showing {filteredTimesheets.length} of {timesheets.length} timesheets
        </p>
      )}

      {selectedTimesheet ? (
        <TimesheetReviewForm
          timesheet={selectedTimesheet}
          onSubmit={(updatedTimesheet) => {
            onUpdateTimesheet(updatedTimesheet);
            setSelectedTimesheet(null);
          }}
          onCancel={() => setSelectedTimesheet(null)}
        />
      ) : (
        <TimesheetList
          timesheets={filteredTimesheets}
          onViewTimesheet={setSelectedTimesheet}
          isAdmin={true}
        />
      )}
    </div>
  );
}

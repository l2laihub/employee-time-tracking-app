import React, { useState } from 'react';
import { Timesheet, TimeEntry } from '../../types/custom.types';
import TimesheetList from './TimesheetList';
import TimesheetReviewForm from './TimesheetReviewForm';
import { Search, Calendar, Building2, CheckCircle, X } from 'lucide-react';

interface AdminTimesheetViewProps {
  timesheets: Timesheet[];
  onUpdateTimesheet: (timesheetId: string, status: string, reviewNotes?: string) => void;
  isAdmin?: boolean;
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

export default function AdminTimesheetView({ 
  timesheets,
  onUpdateTimesheet,
  isAdmin = false
}: AdminTimesheetViewProps) {
  const [filters, setFilters] = useState<TimesheetFilters>(initialFilters);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);

  const pendingCount = timesheets.filter(t => t.status === 'submitted').length;

  const filteredTimesheets = timesheets
    .filter(timesheet => {
      // Search filter
      const searchLower = filters.search.toLowerCase();
      const employeeName = timesheet.employee?.first_name && timesheet.employee?.last_name
        ? `${timesheet.employee.first_name} ${timesheet.employee.last_name}`.toLowerCase()
        : '';
      const matchesSearch = !filters.search || 
        employeeName.includes(searchLower) ||
        timesheet.id.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = !filters.status || 
        (filters.status === 'Pending Review'
          ? ['pending', 'submitted'].includes(timesheet.status)
          : timesheet.status === filters.status);

      // Department filter
      const matchesDepartment = !filters.department || timesheet.employee?.department === filters.department;

      // Date range filter
      const periodStartDate = new Date(timesheet.period_start_date);
      const periodEndDate = new Date(timesheet.period_end_date);
      const startDate = new Date(filters.dateRange.startDate);
      const endDate = new Date(filters.dateRange.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Check if the timesheet period overlaps with the selected date range
      const matchesDateRange = (
        (periodStartDate <= endDate && periodEndDate >= startDate) ||
        (periodStartDate >= startDate && periodStartDate <= endDate) ||
        (periodEndDate >= startDate && periodEndDate <= endDate)
      );

      return matchesSearch && matchesStatus && matchesDepartment && matchesDateRange;
    });

  const departments = Array.from(new Set(timesheets
    .map(t => t.employee?.department)
    .filter(Boolean)));

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters = 
    filters.search !== initialFilters.search ||
    filters.status !== initialFilters.status ||
    filters.department !== initialFilters.department ||
    filters.dateRange.startDate !== initialFilters.dateRange.startDate ||
    filters.dateRange.endDate !== initialFilters.dateRange.endDate;

  const handleSubmitTimesheet = (status: string, reviewNotes?: string) => {
    onUpdateTimesheet(selectedTimesheet!.id, status, reviewNotes);
    setSelectedTimesheet(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Timesheet Management</h1>
        {pendingCount > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            {pendingCount} Pending Review
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search by name or ID"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status"
              name="status"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-4 w-4 text-gray-400" />
              </div>
              <select
                id="department"
                name="department"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                value={filters.department}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">Date Range</label>
            <div className="mt-1 space-y-2">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  name="startDate"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  value={filters.dateRange.startDate}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, startDate: e.target.value }
                  }))}
                />
              </div>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  name="endDate"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  value={filters.dateRange.endDate}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, endDate: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Timesheet List */}
      <TimesheetList
        timesheets={filteredTimesheets}
        onViewTimesheet={setSelectedTimesheet}
        isAdmin={true}
      />

      {/* Review Modal */}
      {selectedTimesheet && (
        <div className="fixed inset-0 z-50">
          <TimesheetReviewForm
            timesheet={selectedTimesheet}
            onSubmit={handleSubmitTimesheet}
            onClose={() => setSelectedTimesheet(null)}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}

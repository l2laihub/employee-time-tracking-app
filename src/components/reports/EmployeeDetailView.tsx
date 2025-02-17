import React, { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useReports } from '../../contexts/ReportsContext';
import { ReportsService } from '../../services/reports';
import LoadingSpinner from '../LoadingSpinner';
import LocationFilter from './controls/LocationFilter';

interface EmployeeDetailViewProps {
  employeeId: string;
  onBack: () => void;
}

interface DebugEntry {
  entry_date: string;
  clock_in_raw: string;
  clock_in_la: string;
  clock_out_raw: string | null;
  clock_out_la: string | null;
  day_of_week: number;
  day_name: string;
  raw_duration_hours: number;
  break_minutes: number;
  worked_hours: number;
  regular_hours: number;
  overtime_hours: number;
  status: string;
  user_id: string;
  organization_id: string;
  included_in_results: boolean;
  exclusion_reason: string | null;
}

export default function EmployeeDetailView({ employeeId, onBack }: EmployeeDetailViewProps) {
  const {
    isLoading,
    error,
    employeeDetails,
    weeklyHours,
    filters,
    fetchEmployeeDetails,
    updateFilters,
    exportTimeEntriesToCSV
  } = useReports();

  useEffect(() => {
    fetchEmployeeDetails(employeeId);
  }, [employeeId, fetchEmployeeDetails]);

  const employee = weeklyHours.find(e => e.id === employeeId);
  const details = employeeDetails[employeeId] || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <h3 className="font-semibold">Error Loading Employee Details</h3>
        <p>{error.message}</p>
        <button
          onClick={() => fetchEmployeeDetails(employeeId)}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Summary
          </button>
          <h2 className="text-xl font-semibold">{employee?.name} - Time Entry Details</h2>
        </div>
        <button
          onClick={async () => {
            const csv = await exportTimeEntriesToCSV(employeeId);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${employee?.name}-time-entries.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={filters.startDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                updateFilters({ startDate: date });
              }
            }}
            className="border border-gray-300 rounded-md p-2"
          />
          <span>to</span>
          <input
            type="date"
            value={filters.endDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                updateFilters({ endDate: date });
              }
            }}
            className="border border-gray-300 rounded-md p-2"
          />
        </div>
        <LocationFilter
          value={filters.jobLocationIds || []}
          onChange={(jobLocationIds) => updateFilters({ jobLocationIds })}
        />
      </div>

      {/* Table */}
      {details.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No time entries found for this employee
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch Break Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch Break End</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch Break</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worked Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {details.map((entry, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.timeIn}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.lunchStart}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.lunchEnd}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.timeOut}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Number(entry.totalHours).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Number(entry.lunchBreak).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Number(entry.workedHours).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.jobLocation}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${entry.status === 'Approved'
                        ? 'bg-green-100 text-green-800'
                        : entry.status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
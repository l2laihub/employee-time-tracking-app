import React, { useEffect } from 'react';
import WeeklyHoursTable from './tables/WeeklyHoursTable';
import EmployeeDetailView from './EmployeeDetailView';
import DateRangePicker from './controls/DateRangePicker';
import ExportButton from './controls/ExportButton';
import FilterBar from './controls/FilterBar';
import { useReports } from '../../contexts/ReportsContext';
import LoadingSpinner from '../LoadingSpinner';

export default function EmployeeHoursReport() {
  const [selectedEmployee, setSelectedEmployee] = React.useState<string | null>(null);
  const {
    isLoading,
    error,
    weeklyHours,
    filters,
    updateFilters,
    fetchWeeklyHours,
    exportWeeklySummaryToCSV
  } = useReports();

  useEffect(() => {
    fetchWeeklyHours();
  }, [filters.startDate, filters.endDate, fetchWeeklyHours]);

  if (selectedEmployee) {
    return (
      <EmployeeDetailView
        employeeId={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

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
        <h3 className="font-semibold">Error Loading Report</h3>
        <p>{error.message}</p>
        <button
          onClick={() => fetchWeeklyHours()}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Weekly Hours Summary</h2>
        <div className="flex items-center space-x-4">
          <DateRangePicker
            startDate={filters.startDate}
            endDate={filters.endDate}
            onStartDateChange={(date) => updateFilters({ startDate: date })}
            onEndDateChange={(date) => updateFilters({ endDate: date })}
          />
          <ExportButton
            onExport={exportWeeklySummaryToCSV}
            filename="weekly-hours-report"
          />
        </div>
      </div>
      
      <FilterBar
        filters={filters}
        onFilterChange={updateFilters}
      />

      {weeklyHours.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No data available for the selected filters
        </div>
      ) : (
        <WeeklyHoursTable
          data={weeklyHours}
          onSelectEmployee={setSelectedEmployee}
        />
      )}
    </div>
  );
}
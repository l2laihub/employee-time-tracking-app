import React from 'react';
import WeeklyHoursTable from './tables/WeeklyHoursTable';
import EmployeeDetailView from './EmployeeDetailView';
import DateRangePicker from './controls/DateRangePicker';
import ExportButton from './controls/ExportButton';
import FilterBar from './controls/FilterBar';
import { weeklyEmployeeHours } from '../../lib/mockReportData';
import { useReportFilters } from '../../lib/hooks/useReportFilters';

export default function EmployeeHoursReport() {
  const [selectedEmployee, setSelectedEmployee] = React.useState<string | null>(null);
  const { 
    filters, 
    updateFilter, 
    filteredData, 
    filteredCount, 
    totalCount 
  } = useReportFilters(weeklyEmployeeHours);

  if (selectedEmployee) {
    return (
      <EmployeeDetailView
        employeeId={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Weekly Hours Summary</h2>
        <div className="flex items-center space-x-4">
          <DateRangePicker
            startDate={filters.startDate || new Date()}
            endDate={filters.endDate || new Date()}
            onStartDateChange={(date) => updateFilter('startDate', date)}
            onEndDateChange={(date) => updateFilter('endDate', date)}
          />
          <ExportButton
            data={filteredData}
            filename="weekly-hours-report"
          />
        </div>
      </div>
      
      <FilterBar
        filters={filters}
        onFilterChange={updateFilter}
      />

      {filteredCount < totalCount && (
        <p className="text-sm text-gray-600 mb-4">
          Showing {filteredCount} of {totalCount} employees
        </p>
      )}

      <WeeklyHoursTable
        data={filteredData}
        onSelectEmployee={setSelectedEmployee}
      />
    </div>
  );
}
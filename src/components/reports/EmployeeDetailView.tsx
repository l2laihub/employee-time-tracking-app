import React from 'react';
import { employeeDetailedHours, weeklyEmployeeHours } from '../../lib/mockReportData';
import EmployeeDetailTable from './tables/EmployeeDetailTable';
import EmployeeDetailFilters from './controls/EmployeeDetailFilters';
import ExportButton from './controls/ExportButton';
import { useEmployeeDetailFilters } from '../../lib/hooks/useEmployeeDetailFilters';
import { ArrowLeft } from 'lucide-react';
import { startOfWeek, endOfWeek } from 'date-fns';

interface EmployeeDetailViewProps {
  employeeId: string;
  onBack: () => void;
}

export default function EmployeeDetailView({ employeeId, onBack }: EmployeeDetailViewProps) {
  const employee = weeklyEmployeeHours.find(emp => emp.id === employeeId);
  const details = employeeDetailedHours[employeeId] || [];
  
  // Initialize with current week's date range
  const initialDateRange = {
    startDate: startOfWeek(new Date(), { weekStartsOn: 1 }), // Start from Monday
    endDate: endOfWeek(new Date(), { weekStartsOn: 1 }) // End on Sunday
  };
  
  const { 
    filters, 
    updateFilter, 
    filteredEntries,
    filteredCount, 
    totalEntries 
  } = useEmployeeDetailFilters(details, initialDateRange);

  if (!employee) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Summary
        </button>
        <p className="mt-4 text-gray-600">Employee not found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Summary
          </button>
          <h3 className="text-lg font-semibold">{employee.name} - Time Entry Details</h3>
        </div>
        <ExportButton
          data={filteredEntries}
          filename={`employee-${employeeId}-details`}
        />
      </div>

      <EmployeeDetailFilters
        filters={filters}
        onFilterChange={updateFilter}
      />

      {filteredCount < totalEntries && (
        <p className="text-sm text-gray-600 mb-4">
          Showing {filteredCount} of {totalEntries} entries
        </p>
      )}

      <EmployeeDetailTable entries={filteredEntries} />
    </div>
  );
}